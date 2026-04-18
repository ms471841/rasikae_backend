import { forwardRef, Module } from '@nestjs/common';
import { DriversModule } from '../drivers/drivers.module';
import { OrdersModule } from '../orders/orders.module';
import { SocketsGateway } from './sockets.gateway';

@Module({
  imports: [
    DriversModule,
    forwardRef(() => OrdersModule),
  ],
  providers: [SocketsGateway],
  exports: [SocketsGateway],
})
export class SocketsModule {}
