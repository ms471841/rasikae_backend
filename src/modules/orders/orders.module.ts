import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { Order, OrderSchema } from './schemas/order.schema';
import { MenuItem, MenuItemSchema } from '../menu-items/schemas/menu-item.schema';
import { Restaurant, RestaurantSchema } from '../restaurants/schemas/restaurant.schema';
import { Transaction, TransactionSchema } from '../payments/schemas/transaction.schema';
import { CartsModule } from '../carts/carts.module';
import { DriversModule } from '../drivers/drivers.module';
import { WalletsModule } from '../wallets/wallets.module';
import { SocketsModule } from '../sockets/sockets.module';
import { PaymentsModule } from '../payments/payments.module';
import { UsersModule } from '../users/users.module';
import { FirebaseModule } from '../firebase/firebase.module';
import { forwardRef } from '@nestjs/common';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Order.name, schema: OrderSchema },
      { name: MenuItem.name, schema: MenuItemSchema },
      { name: Restaurant.name, schema: RestaurantSchema },
      { name: Transaction.name, schema: TransactionSchema },
    ]),
    CartsModule,
    DriversModule,
    WalletsModule,
    forwardRef(() => SocketsModule),
    PaymentsModule,
    UsersModule,
    FirebaseModule,
  ],
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}
