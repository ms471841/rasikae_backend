import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document } from 'mongoose';

export type WalletDocument = Wallet & Document;

@Schema({ timestamps: true })
export class Wallet {
  @Prop({ type: String, enum: ['DRIVER', 'RESTAURANT', 'PLATFORM'], required: true, default: 'DRIVER' })
  walletType: string;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User' })
  userId?: mongoose.Types.ObjectId;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant' })
  restaurantId?: mongoose.Types.ObjectId;

  @Prop({ required: true, default: 0 })
  availableBalance: number;

  @Prop({ required: true, default: 0 })
  totalEarned: number;

  @Prop({ required: true, default: 0 })
  cashInHand: number;
}

export const WalletSchema = SchemaFactory.createForClass(Wallet);
