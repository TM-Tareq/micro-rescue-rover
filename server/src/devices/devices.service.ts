import { Injectable, Logger } from '@nestjs/common';

export interface DeviceInfo {
  deviceId: string;
  type: string;
  socketId: string;
  status: 'online' | 'offline';
  connectedAt: Date;
}

@Injectable()
export class DevicesService {
  private readonly logger = new Logger(DevicesService.name);
  private devices = new Map<string, DeviceInfo>();
  private socketToDeviceMap = new Map<string, string>();

  registerDevice(deviceId: string, type: string, socketId: string): DeviceInfo {
    const device: DeviceInfo = {
      deviceId,
      type,
      socketId,
      status: 'online',
      connectedAt: new Date(),
    };

    this.devices.set(deviceId, device);
    this.socketToDeviceMap.set(socketId, deviceId);
    this.logger.log(`Device registered: ${deviceId} (${type}) on socket ${socketId}`);
    return device;
  }

  unregisterSocket(socketId: string): string | null {
    const deviceId = this.socketToDeviceMap.get(socketId);
    if (deviceId) {
      this.socketToDeviceMap.delete(socketId);
      const device = this.devices.get(deviceId);
      if (device && device.socketId === socketId) {
        device.status = 'offline';
        this.logger.log(`Device offline: ${deviceId}`);
      }
      return deviceId;
    }
    return null;
  }

  getDevice(deviceId: string): DeviceInfo | undefined {
    return this.devices.get(deviceId);
  }

  getDeviceBySocket(socketId: string): DeviceInfo | undefined {
    const deviceId = this.socketToDeviceMap.get(socketId);
    return deviceId ? this.devices.get(deviceId) : undefined;
  }

  getAllDevices(): DeviceInfo[] {
    return Array.from(this.devices.values());
  }

  isDeviceOnline(deviceId: string): boolean {
    const dev = this.devices.get(deviceId);
    return dev ? dev.status === 'online' : false;
  }
}
