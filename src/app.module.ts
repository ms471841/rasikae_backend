import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './modules/database/database.module';
import { FirebaseModule } from './modules/firebase/firebase.module';
import { AuthModule } from './modules/auth/auth.module';

import { ConfigModule } from '@nestjs/config';
import { validate } from './config/env.validation';
import { UsersModule } from './modules/users/users.module';
import { VendorsModule } from './modules/vendors/vendors.module';
import { RestaurantsModule } from './modules/restaurants/restaurants.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { CuisinesModule } from './modules/cuisines/cuisines.module';
import { MenuItemsModule } from './modules/menu-items/menu-items.module';
import { CartsModule } from './modules/carts/carts.module';
import { OrdersModule } from './modules/orders/orders.module';
import { DriversModule } from './modules/drivers/drivers.module';
import { WalletsModule } from './modules/wallets/wallets.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { SocketsModule } from './modules/sockets/sockets.module';
import { PromotionsModule } from './modules/promotions/promotions.module';
import { AddressesModule } from './modules/addresses/addresses.module';
import { ReviewsModule } from './modules/reviews/reviews.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { UploadsModule } from './modules/uploads/uploads.module';
import { SettingsModule } from './modules/settings/settings.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate }),
    DatabaseModule,
    FirebaseModule,
    AuthModule,
    UsersModule,
    VendorsModule,
    RestaurantsModule,
    CategoriesModule,
    CuisinesModule,
    MenuItemsModule,
    CartsModule,
    OrdersModule,
    DriversModule,
    WalletsModule,
    AnalyticsModule,
    SocketsModule,
    PromotionsModule,
    AddressesModule,
    ReviewsModule,
    PaymentsModule,
    NotificationsModule,
    UploadsModule,
    SettingsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
