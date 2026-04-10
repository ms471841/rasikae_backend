import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document } from 'mongoose';

export type PromotionDocument = Promotion & Document;

export enum DiscountType {
  PERCENTAGE = 'PERCENTAGE',
  FLAT = 'FLAT',
}

@Schema({ timestamps: true })
export class Promotion {
  @Prop({ required: true, unique: true, uppercase: true, trim: true })
  code: string;

  @Prop()
  description?: string;

  @Prop({ enum: DiscountType, required: true })
  discountType: string;

  @Prop({ required: true })
  discountValue: number;

  @Prop({ default: 0 })
  minOrderValue: number;

  @Prop()
  maxDiscount?: number;

  @Prop()
  startDate?: Date;

  @Prop()
  endDate?: Date;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant', default: null })
  restaurantId?: mongoose.Types.ObjectId;

  @Prop()
  usageLimit?: number;

  @Prop({ default: 0 })
  usedCount: number;

  @Prop({ type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], default: [] })
  usedBy: mongoose.Types.ObjectId[];
}

export const PromotionSchema = SchemaFactory.createForClass(Promotion);
