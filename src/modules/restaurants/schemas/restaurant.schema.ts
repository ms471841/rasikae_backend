import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document } from 'mongoose';
import { User } from '../../users/schemas/user.schema';

export type RestaurantDocument = Restaurant & Document;

@Schema({ _id: false })
class Location {
  @Prop({ type: String, enum: ['Point'], default: 'Point' })
  type: string;

  @Prop({ type: [Number], required: true })
  coordinates: number[]; // [longitude, latitude]
}

const LocationSchema = SchemaFactory.createForClass(Location);

@Schema({ _id: false })
class OperatingHours {
  @Prop()
  open: string; // e.g., "09:00 AM"

  @Prop()
  close: string; // e.g., "10:00 PM"
}

const OperatingHoursSchema = SchemaFactory.createForClass(OperatingHours);

@Schema({ timestamps: true })
export class Restaurant {
  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true })
  ownerId: mongoose.Types.ObjectId;

  @Prop({ required: true })
  name: string;

  @Prop()
  phone?: string;

  @Prop()
  description?: string;

  @Prop()
  logo?: string;

  @Prop({ type: [String], default: [] })
  coverImages?: string[];

  @Prop({
    type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Category' }],
    default: [],
  })
  categories?: mongoose.Types.ObjectId[];

  @Prop({
    type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Cuisine' }],
    default: [],
  })
  cuisines?: mongoose.Types.ObjectId[];

  @Prop()
  deliveryTime?: number;

  @Prop({ default: false })
  isFeatured?: boolean;

  @Prop({ default: false })
  isFreeDelivery?: boolean;

  @Prop({ default: false })
  isVeg?: boolean;

  @Prop({ default: 0 })
  rating?: number;

  @Prop({ default: 0 })
  ratingSum?: number;

  @Prop({ default: 0 })
  ratingCount?: number;

  @Prop({ type: LocationSchema, index: '2dsphere' })
  location?: Location;

  @Prop()
  address?: string;

  @Prop()
  city?: string;

  @Prop({ type: OperatingHoursSchema })
  operatingHours?: OperatingHours;

  @Prop({ default: 'pending', enum: ['pending', 'approved', 'rejected'] })
  status: string;

  @Prop({ default: false })
  isPublished: boolean;

  @Prop()
  gstNumber?: string;

  @Prop()
  fssaiNumber?: string;

  // Dynamic delivery time tracking (rolling average from actual deliveries)
  @Prop({ default: 0 })
  totalDeliveryTimeMinutes?: number;

  @Prop({ default: 0 })
  deliveryCount?: number;
}

export const RestaurantSchema = SchemaFactory.createForClass(Restaurant);

RestaurantSchema.index({ ownerId: 1 });
RestaurantSchema.index({ status: 1, isPublished: 1, rating: -1 });
