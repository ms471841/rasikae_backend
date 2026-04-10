import { Module } from '@nestjs/common';
import { SocketsGateway } from './sockets.gateway';

@Module({
  providers: [SocketsGateway],
  exports: [SocketsGateway], // Export so OrdersModule can use it
})
export class SocketsModule {}
