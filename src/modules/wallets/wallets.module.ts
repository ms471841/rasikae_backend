import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { WalletsService } from './wallets.service';
import { WalletsController } from './wallets.controller';
import { Wallet, WalletSchema } from './schemas/wallet.schema';
import { Transaction, TransactionSchema } from './schemas/transaction.schema';
import { SettingsModule } from '../settings/settings.module';
import {
  BankAccount,
  BankAccountSchema,
} from '../restaurants/schemas/bank-account.schema';
import {
  Restaurant,
  RestaurantSchema,
} from '../restaurants/schemas/restaurant.schema';
import { PaymentsModule } from '../payments/payments.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Wallet.name, schema: WalletSchema },
      { name: Transaction.name, schema: TransactionSchema },
      { name: BankAccount.name, schema: BankAccountSchema },
      { name: Restaurant.name, schema: RestaurantSchema },
    ]),
    SettingsModule,
    PaymentsModule,
  ],
  controllers: [WalletsController],
  providers: [WalletsService],
  exports: [WalletsService], // Needed by DriversModule and OrdersModule
})
export class WalletsModule {}
