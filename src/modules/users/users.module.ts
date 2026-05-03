import { Module, Global } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { Address, AddressSchema } from '../addresses/schemas/address.schema';
import { Cart, CartSchema } from '../carts/schemas/cart.schema';
import { User, UserSchema } from './schemas/user.schema';
import { Order, OrderSchema } from '../orders/schemas/order.schema';
import { Vendor, VendorSchema } from '../vendors/schemas/vendor.schema';

@Global()
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Address.name, schema: AddressSchema },
      { name: Cart.name, schema: CartSchema },
      { name: Order.name, schema: OrderSchema },
      { name: Vendor.name, schema: VendorSchema },
    ]),
  ],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
