import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document } from 'mongoose';

export type CartDocument = Cart & Document;

@Schema({ _id: false })
class SelectedVariant {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  price: number;
}
const SelectedVariantSchema = SchemaFactory.createForClass(SelectedVariant);

@Schema({ _id: false })
class SelectedAddon {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  price: number;

  @Prop({ required: true })
  groupName: string;
}
const SelectedAddonSchema = SchemaFactory.createForClass(SelectedAddon);

@Schema()
export class CartItem {
  @Prop({ type: mongoose.Schema.Types.ObjectId, auto: true })
  _id: mongoose.Types.ObjectId;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'MenuItem', required: true })
  menuItemId: mongoose.Types.ObjectId;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant', required: true })
  restaurantId: mongoose.Types.ObjectId;

  @Prop({ required: true, min: 1 })
  quantity: number;

  @Prop({ required: true })
  price: number;

  @Prop({ type: SelectedVariantSchema, required: false })
  variant?: SelectedVariant;

  @Prop({ type: [SelectedAddonSchema], default: [] })
  addons: SelectedAddon[];

  @Prop({ required: true })
  totalItemPrice: number;
}

const CartItemSchema = SchemaFactory.createForClass(CartItem);

@Schema({ timestamps: true })
export class Cart {
  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true })
  userId: mongoose.Types.ObjectId;

  @Prop({ type: [CartItemSchema], default: [] })
  items: CartItem[];

  @Prop({ required: true, default: 0 })
  totalPrice: number; // Stored in Paise (integers)
}

export const CartSchema = SchemaFactory.createForClass(Cart);
