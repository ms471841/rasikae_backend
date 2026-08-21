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
class AddonOption {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  price: number;
}
const AddonOptionSchema = SchemaFactory.createForClass(AddonOption);

@Schema({ _id: false })
class AddonGroup {
  @Prop({ required: true })
  name: string;

  @Prop({ default: false })
  isRequired: boolean;

  @Prop({ default: true })
  isMultiple: boolean;

  @Prop({ default: 0 })
  minSelections: number;

  @Prop({ default: 1 })
  maxSelections: number;

  @Prop({ type: [AddonOptionSchema], default: [] })
  options: AddonOption[];
}
const AddonGroupSchema = SchemaFactory.createForClass(AddonGroup);

@Schema({ timestamps: true })
export class MenuItem {
  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Restaurant',
    required: true,
  })
  restaurantId: mongoose.Types.ObjectId;

  @Prop({
    type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Category' }],
    default: [],
  })
  categoryIds: mongoose.Types.ObjectId[];

  @Prop({
    type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Cuisine' }],
    default: [],
  })
  cuisines: mongoose.Types.ObjectId[];

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

  @Prop()
  thumbnail?: string;

  @Prop({ default: true })
  isAvailable: boolean;

  @Prop({ default: false })
  isVeg: boolean;

  @Prop({ default: false })
  isSpicy: boolean;

  @Prop({ type: [String], default: [] })
  spiceLevels: string[];

  @Prop({ default: 0 })
  packagingChargeInPaise: number;

  @Prop({ default: 0 })
  preparationTimeMinutes: number;

  @Prop({ default: 0 })
  rating: number;

  @Prop({ default: 0 })
  ratingCount: number;

  @Prop({ type: [VariantSchema], default: [] })
  variants: Variant[];

  @Prop({ type: [AddonGroupSchema], default: [] })
  addonGroups: AddonGroup[];
}

export const MenuItemSchema = SchemaFactory.createForClass(MenuItem);

MenuItemSchema.index({ restaurantId: 1, isAvailable: 1 });
MenuItemSchema.index({ categoryIds: 1 });
