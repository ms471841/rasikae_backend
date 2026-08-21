import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document } from 'mongoose';

export type PaymentTransactionDocument = PaymentTransaction & Document;

export enum TransactionStatus {
  PENDING = 'PENDING',
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
}

export enum TransactionType {
  ORDER_PAYMENT = 'ORDER_PAYMENT',
  WALLET_TOPUP = 'WALLET_TOPUP',
  REFUND = 'REFUND',
}

@Schema({ timestamps: true, collection: 'paymenttransactions' })
export class PaymentTransaction {
  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true })
  userId: mongoose.Types.ObjectId;

  @Prop({ required: true })
  amount: number;

  @Prop({ default: 'INR' })
  currency: string;

  @Prop({ enum: TransactionStatus, default: TransactionStatus.PENDING })
  status: string;

  @Prop({ enum: TransactionType, required: true })
  type: string;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'Order' })
  orderId?: mongoose.Types.ObjectId;

  @Prop()
  razorpayOrderId?: string;

  @Prop()
  razorpayPaymentId?: string;

  @Prop()
  razorpaySignature?: string;

  @Prop({ type: mongoose.Schema.Types.Mixed })
  metadata?: any;
}

export const PaymentTransactionSchema =
  SchemaFactory.createForClass(PaymentTransaction);

PaymentTransactionSchema.index(
  { razorpayOrderId: 1 },
  { unique: true, sparse: true },
);
PaymentTransactionSchema.index({ userId: 1, createdAt: -1 });
PaymentTransactionSchema.index({ status: 1, createdAt: -1 });
