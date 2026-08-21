import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import {
  PaymentTransaction,
  PaymentTransactionSchema,
} from './schemas/transaction.schema';
import { RazorpayModule } from './razorpay.module';
import { Order, OrderSchema } from '../orders/schemas/order.schema';
import { Wallet, WalletSchema } from '../wallets/schemas/wallet.schema';
import {
  Transaction as WalletTransaction,
  TransactionSchema as WalletTransactionSchema,
} from '../wallets/schemas/transaction.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: PaymentTransaction.name, schema: PaymentTransactionSchema },
      { name: Order.name, schema: OrderSchema },
      { name: Wallet.name, schema: WalletSchema },
      { name: WalletTransaction.name, schema: WalletTransactionSchema },
    ]),
    RazorpayModule,
  ],
  controllers: [PaymentsController],
  providers: [PaymentsService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
