import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document } from 'mongoose';

export type TransactionDocument = Transaction & Document;

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

@Schema({ timestamps: true })
export class Transaction {
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

export const TransactionSchema = SchemaFactory.createForClass(Transaction);
