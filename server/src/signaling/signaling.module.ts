import { Module } from '@nestjs/common';
import { SignalingGateway } from './signaling.gateway';
import { SignalingService } from './signaling.service';
import { DevicesModule } from '../devices/devices.module';

@Module({
  imports: [DevicesModule],
  providers: [SignalingGateway, SignalingService],
  exports: [SignalingGateway, SignalingService],
})
export class SignalingModule {}
