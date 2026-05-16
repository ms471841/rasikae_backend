import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document } from 'mongoose';

export type OrderDocument = Order & Document;

export enum OrderStatus {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  PREPARING = 'PREPARING',
  READY = 'READY',
  OUT_FOR_DELIVERY = 'OUT_FOR_DELIVERY',
  DELIVERED = 'DELIVERED',
  CANCELLED = 'CANCELLED',
}

@Schema({ _id: false })
export class Address {
  @Prop({ required: true })
  street: string;

  @Prop({ required: true })
  city: string;

  @Prop({ required: false })
  state?: string;

  @Prop({ required: false })
  postalCode?: string;

  @Prop({ type: { lat: Number, lng: Number }, _id: false })
  geo?: { lat: number; lng: number };
}

const AddressSchema = SchemaFactory.createForClass(Address);

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
export class OrderItem {
  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'MenuItem', required: true })
  menuItemId: mongoose.Types.ObjectId;

  @Prop({ required: true })
  name: string;

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

const OrderItemSchema = SchemaFactory.createForClass(OrderItem);

@Schema({ timestamps: true })
export class Order {
  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true })
  userId: mongoose.Types.ObjectId;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant', required: true })
  restaurantId: mongoose.Types.ObjectId;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'Driver', required: false })

  driverId?: mongoose.Types.ObjectId;

  @Prop({ type: [OrderItemSchema], required: true })
  items: OrderItem[];

  @Prop({ type: AddressSchema, required: true })
  deliveryAddress: Address;

  @Prop({ required: true })
  subTotal: number; // Stored in Paise (integers)

  @Prop({ required: true, default: 0 })
  tax: number; // Total Tax (Paise)

  @Prop({ required: true, default: 0 })
  cgst: number; // Central GST (2.5%) in Paise

  @Prop({ required: true, default: 0 })
  sgst: number; // State GST (2.5%) in Paise

  @Prop({ required: true, default: 0 })
  deliveryFee: number; // Stored in Paise (integers)

  @Prop({ required: true, default: 0 })
  packagingFee: number; // Stored in Paise (integers)

  @Prop({ required: true, default: 0 })
  discountAmount: number; // Stored in Paise (integers)

  @Prop({ required: false })
  couponCode?: string;

  @Prop({ required: true })
  totalAmount: number; // Stored in Paise (integers)

  @Prop({ required: true, enum: OrderStatus, default: OrderStatus.PENDING })
  status: string;

  @Prop({ required: true })
  paymentMethod: string;

  @Prop({ required: true, default: 'PENDING' })
  paymentStatus: string;

  @Prop({ default: false })
  isReviewed: boolean;

  @Prop({ required: false, index: true })
  idempotencyKey?: string;

  @Prop({ required: false })
  deliveredAt?: Date;

  @Prop({ required: false })
  actualDeliveryTimeMinutes?: number;

  createdAt: Date;
  updatedAt: Date;
}

export const OrderSchema = SchemaFactory.createForClass(Order);
