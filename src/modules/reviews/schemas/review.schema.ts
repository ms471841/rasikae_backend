import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document } from 'mongoose';

export type ReviewDocument = Review & Document;

export enum TargetType {
  RESTAURANT = 'RESTAURANT',
  DRIVER = 'DRIVER',
  MENU_ITEM = 'MENU_ITEM',
}

@Schema({ timestamps: true })
export class Review {
  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true })
  userId: mongoose.Types.ObjectId;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true })
  orderId: mongoose.Types.ObjectId;

  @Prop({ enum: TargetType, required: true })
  targetType: string;

  @Prop({ type: mongoose.Schema.Types.ObjectId, required: true })
  targetId: mongoose.Types.ObjectId;

  @Prop({ required: true, min: 1, max: 5 })
  rating: number;

  @Prop()
  comment?: string;

  @Prop({ type: [String], default: [] })
  images?: string[];
}

export const ReviewSchema = SchemaFactory.createForClass(Review);

ReviewSchema.index({ targetId: 1, targetType: 1, createdAt: -1 });
ReviewSchema.index({ userId: 1, createdAt: -1 });
ReviewSchema.index(
  { orderId: 1, targetId: 1, targetType: 1 },
  { unique: true },
);
