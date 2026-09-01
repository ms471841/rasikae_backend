import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type FaqDocument = Faq & Document;

@Schema({ timestamps: true })
export class Faq {
  @Prop({ required: true, trim: true, index: 'text' })
  question: string;

  @Prop({ required: true, trim: true })
  answer: string;

  @Prop({ required: true, default: 'General', trim: true, index: true })
  category: string;

  @Prop({ default: 0, index: true })
  order: number;

  @Prop({ default: true, index: true })
  isActive: boolean;

  @Prop({ type: [String], default: [] })
  tags?: string[];
}

export const FaqSchema = SchemaFactory.createForClass(Faq);

FaqSchema.index({ category: 1, order: 1, createdAt: -1 });
