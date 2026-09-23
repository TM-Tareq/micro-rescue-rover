import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class SignalingService {
  private readonly logger = new Logger(SignalingService.name);

  // Active call connections map: targetDeviceId -> webSocketId
  private activeCalls = new Map<string, string>();

  startCall(targetDeviceId: string, callerSocketId: string) {
    this.activeCalls.set(targetDeviceId, callerSocketId);
    this.logger.log(`Call initiated for target: ${targetDeviceId} from socket: ${callerSocketId}`);
  }

  endCall(targetDeviceId: string) {
    this.activeCalls.delete(targetDeviceId);
    this.logger.log(`Call ended for target: ${targetDeviceId}`);
  }

  getCallerForDevice(targetDeviceId: string): string | undefined {
    return this.activeCalls.get(targetDeviceId);
  }
}
