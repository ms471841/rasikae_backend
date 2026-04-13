import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { FavouriteRestaurantsController } from './favourite-restaurants.controller';
import { FavouriteRestaurantsService } from './favourite-restaurants.service';
import { User, UserSchema } from '../users/schemas/user.schema';
import { Restaurant, RestaurantSchema } from '../restaurants/schemas/restaurant.schema';
import { AuthModule } from '../auth/auth.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Restaurant.name, schema: RestaurantSchema },
    ]),
    AuthModule,
    UsersModule,
  ],
  controllers: [FavouriteRestaurantsController],
  providers: [FavouriteRestaurantsService],
  exports: [FavouriteRestaurantsService],
})
export class FavouriteRestaurantsModule {}
