import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document } from 'mongoose';

export type MenuItemDocument = MenuItem & Document;

@Schema({ _id: false })
class Variant {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  price: number;
}
const VariantSchema = SchemaFactory.createForClass(Variant);

@Schema({ _id: false })
class Addon {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  price: number;
}
const AddonSchema = SchemaFactory.createForClass(Addon);

@Schema({ timestamps: true })
export class MenuItem {
  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant', required: true })
  restaurantId: mongoose.Types.ObjectId;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true })
  categoryId: mongoose.Types.ObjectId;

  @Prop({ required: true })
  name: string;

  @Prop()
  description?: string;

  @Prop({ required: true })
  price: number;

  @Prop()
  discountPrice?: number;

  @Prop()
  image?: string;

  @Prop({ default: true })
  isAvailable: boolean;

  @Prop({ default: false })
  isVeg: boolean;

  @Prop({ default: false })
  isSpicy: boolean;

  @Prop({ default: 0 })
  rating: number;

  @Prop({ default: 0 })
  ratingCount: number;

  @Prop({ type: [VariantSchema], default: [] })
  variants: Variant[];

  @Prop({ type: [AddonSchema], default: [] })
  addons: Addon[];
}

export const MenuItemSchema = SchemaFactory.createForClass(MenuItem);
