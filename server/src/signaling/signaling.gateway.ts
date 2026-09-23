import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { DevicesService } from '../devices/devices.service';
import { SignalingService } from './signaling.service';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class SignalingGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(SignalingGateway.name);

  constructor(
    private readonly devicesService: DevicesService,
    private readonly signalingService: SignalingService,
  ) {}

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
    const deviceId = this.devicesService.unregisterSocket(client.id);

    if (deviceId) {
      this.logger.warn(`Device ${deviceId} went offline due to socket disconnect.`);
      this.server.emit('device:offline', { deviceId });
    }
  }

  @SubscribeMessage('device:register')
  handleDeviceRegister(
    @MessageBody() data: { deviceId: string; type: string },
    @ConnectedSocket() client: Socket,
  ) {
    if (!data || !data.deviceId) {
      return { status: 'error', message: 'Missing deviceId' };
    }

    const device = this.devicesService.registerDevice(data.deviceId, data.type || 'raspberry-pi', client.id);

    // Notify all connected web clients that the device is online
    this.server.emit('device:online', {
      deviceId: device.deviceId,
      type: device.type,
      status: 'online',
    });

    return { status: 'ok', deviceId: device.deviceId };
  }

  @SubscribeMessage('device:status')
  handleDeviceStatus(@MessageBody() data: { deviceId: string }) {
    const deviceId = data?.deviceId || 'rover-01';
    const isOnline = this.devicesService.isDeviceOnline(deviceId);
    const device = this.devicesService.getDevice(deviceId);

    return {
      deviceId,
      status: isOnline ? 'online' : 'offline',
      device: device || null,
    };
  }

  @SubscribeMessage('call:start')
  handleCallStart(
    @MessageBody() data: { targetDeviceId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const target = this.devicesService.getDevice(data.targetDeviceId);
    if (!target || target.status !== 'online') {
      client.emit('call:error', { message: `Target device ${data.targetDeviceId} is offline or not registered` });
      return;
    }

    this.signalingService.startCall(data.targetDeviceId, client.id);
    this.server.to(target.socketId).emit('call:incoming', {
      callerSocketId: client.id,
      targetDeviceId: data.targetDeviceId,
    });
  }

  @SubscribeMessage('webrtc:offer')
  handleWebRtcOffer(
    @MessageBody() data: { targetDeviceId: string; sdp: any },
    @ConnectedSocket() client: Socket,
  ) {
    const target = this.devicesService.getDevice(data.targetDeviceId);
    if (!target || target.status !== 'online') {
      client.emit('call:error', { message: `Device ${data.targetDeviceId} is offline` });
      return;
    }

    this.logger.log(`Forwarding WebRTC offer to ${data.targetDeviceId}`);
    this.server.to(target.socketId).emit('webrtc:offer', {
      callerSocketId: client.id,
      targetDeviceId: data.targetDeviceId,
      sdp: data.sdp,
    });
  }

  @SubscribeMessage('webrtc:answer')
  handleWebRtcAnswer(
    @MessageBody() data: { targetDeviceId: string; callerSocketId?: string; sdp: any },
    @ConnectedSocket() client: Socket,
  ) {
    const callerSocketId = data.callerSocketId || this.signalingService.getCallerForDevice(data.targetDeviceId);
    if (callerSocketId) {
      this.logger.log(`Forwarding WebRTC answer from ${data.targetDeviceId} to caller ${callerSocketId}`);
      this.server.to(callerSocketId).emit('webrtc:answer', {
        targetDeviceId: data.targetDeviceId,
        sdp: data.sdp,
      });
    } else {
      this.logger.warn(`No caller socket found for device ${data.targetDeviceId}`);
    }
  }

  @SubscribeMessage('webrtc:ice-candidate')
  handleIceCandidate(
    @MessageBody() data: { targetDeviceId?: string; candidate: any; recipientSocketId?: string },
    @ConnectedSocket() client: Socket,
  ) {
    if (data.recipientSocketId) {
      // Send to specific recipient
      this.server.to(data.recipientSocketId).emit('webrtc:ice-candidate', {
        candidate: data.candidate,
        senderSocketId: client.id,
      });
      return;
    }

    if (data.targetDeviceId) {
      const target = this.devicesService.getDevice(data.targetDeviceId);
      if (target && target.status === 'online') {
        this.server.to(target.socketId).emit('webrtc:ice-candidate', {
          candidate: data.candidate,
          senderSocketId: client.id,
        });
      } else {
        const callerSocketId = this.signalingService.getCallerForDevice(data.targetDeviceId);
        if (callerSocketId) {
          this.server.to(callerSocketId).emit('webrtc:ice-candidate', {
            candidate: data.candidate,
            senderSocketId: client.id,
          });
        }
      }
    }
  }

  @SubscribeMessage('call:end')
  handleCallEnd(
    @MessageBody() data: { targetDeviceId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const target = this.devicesService.getDevice(data.targetDeviceId);
    this.signalingService.endCall(data.targetDeviceId);

    if (target && target.status === 'online') {
      this.server.to(target.socketId).emit('call:ended', {
        callerSocketId: client.id,
        targetDeviceId: data.targetDeviceId,
      });
    }
  }
}
