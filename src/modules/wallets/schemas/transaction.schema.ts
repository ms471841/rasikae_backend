import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document } from 'mongoose';

export type TransactionDocument = Transaction & Document;

export enum TransactionType {
  DELIVERY_EARNING = 'DELIVERY_EARNING',
  CASH_COLLECTED = 'CASH_COLLECTED',
  WITHDRAWAL = 'WITHDRAWAL',
  ADMIN_SETTLEMENT = 'ADMIN_SETTLEMENT',
  RESTAURANT_EARNING = 'RESTAURANT_EARNING',
  PLATFORM_COMMISSION = 'PLATFORM_COMMISSION',
  WALLET_TOPUP = 'WALLET_TOPUP',
  TAX_COLLECTED = 'TAX_COLLECTED',
  CGST_COLLECTED = 'CGST_COLLECTED',
  SGST_COLLECTED = 'SGST_COLLECTED',
}

export enum TransactionStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  REJECTED = 'REJECTED',
  FAILED = 'FAILED',
}

@Schema({ timestamps: true })
export class Transaction {
  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'Wallet', required: true })
  walletId: mongoose.Types.ObjectId;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: false })
  orderId?: mongoose.Types.ObjectId;

  @Prop({ required: true })
  amount: number;

  @Prop({ type: String, enum: TransactionType, required: true })
  type: string;

  @Prop({
    type: String,
    enum: TransactionStatus,
    required: true,
    default: TransactionStatus.COMPLETED,
  })
  status: string;

  @Prop({ required: true })
  description: string;

  @Prop()
  razorpayPayoutId?: string;

  createdAt: Date;
  updatedAt: Date;
}

export const TransactionSchema = SchemaFactory.createForClass(Transaction);

TransactionSchema.index({ walletId: 1, createdAt: -1 });
TransactionSchema.index({ type: 1, status: 1, createdAt: -1 });
TransactionSchema.index({ razorpayPayoutId: 1 }, { sparse: true });
