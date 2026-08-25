import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document } from 'mongoose';

export type DriverDocument = Driver & Document;

export enum VehicleType {
  BICYCLE = 'BICYCLE',
  SCOOTER = 'SCOOTER',
  CAR = 'CAR',
  MOTORCYCLE = 'MOTORCYCLE',
}

@Schema({ _id: false })
export class Location {
  @Prop({ type: String, enum: ['Point'], default: 'Point' })
  type: string;

  @Prop({ type: [Number], required: true }) // [longitude, latitude]
  coordinates: number[];
}

const LocationSchema = SchemaFactory.createForClass(Location);

@Schema({ timestamps: true })
export class Driver {
  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
  })
  userId: mongoose.Types.ObjectId;

  @Prop({ type: String, enum: VehicleType, required: true })
  vehicleType: string;

  @Prop()
  licensePlate?: string;

  @Prop({ default: false })
  isAvailable: boolean;

  @Prop({ type: LocationSchema, index: '2dsphere' })
  currentLocation?: Location;

  @Prop({ default: 0 })
  rating: number;

  @Prop({ default: 0 })
  ratingCount: number;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'Zone', index: true })
  activeZoneId?: mongoose.Types.ObjectId;

  @Prop({ default: 0 })
  totalDeliveries: number;
}

export const DriverSchema = SchemaFactory.createForClass(Driver);

DriverSchema.index({ activeZoneId: 1, isAvailable: 1 });
DriverSchema.index({ isAvailable: 1 });
DriverSchema.index({ rating: -1 });
