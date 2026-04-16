import { Module } from '@nestjs/common';
import { DriversModule } from '../drivers/drivers.module';
import { SocketsGateway } from './sockets.gateway';

@Module({
  imports: [DriversModule],
  providers: [SocketsGateway],
  exports: [SocketsGateway], // Export so OrdersModule can use it
})
export class SocketsModule {}
