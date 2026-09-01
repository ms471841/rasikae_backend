import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ContentDocument = Content & Document;

@Schema({ timestamps: true })
export class Content {
  @Prop({ required: true, unique: true, index: true })
  slug: string; // e.g. 'terms', 'privacy', 'about', 'refund'

  @Prop({ required: true })
  title: string; // e.g. 'Terms and Conditions'

  @Prop({ default: '' })
  content: string; // Markdown formatted text

  @Prop({ default: 1 })
  version: number;

  @Prop({ default: true, index: true })
  isPublished: boolean;

  @Prop({ default: '' })
  metaDescription?: string;

  @Prop({ default: '' })
  lastUpdatedBy?: string;
}

export const ContentSchema = SchemaFactory.createForClass(Content);
