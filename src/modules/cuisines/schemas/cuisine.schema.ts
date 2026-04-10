import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type CuisineDocument = Cuisine & Document;

@Schema({ timestamps: true })
export class Cuisine {
  @Prop({ required: true, unique: true })
  name: string;

  @Prop({ default: true })
  isActive: boolean;
}

export const CuisineSchema = SchemaFactory.createForClass(Cuisine);
