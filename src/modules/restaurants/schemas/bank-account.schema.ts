import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document } from 'mongoose';

export type BankAccountDocument = BankAccount & Document;

@Schema({ timestamps: true })
export class BankAccount {
  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant', required: true })
  restaurantId: mongoose.Types.ObjectId;

  @Prop({ required: true })
  bankAccountName: string;

  @Prop({ required: true })
  bankAccountNumber: string;

  @Prop({ required: true })
  bankIfscCode: string;

  // Razorpay Specific Fields
  @Prop()
  razorpayContactId?: string;

  @Prop()
  razorpayFundAccountId?: string;
}

export const BankAccountSchema = SchemaFactory.createForClass(BankAccount);
