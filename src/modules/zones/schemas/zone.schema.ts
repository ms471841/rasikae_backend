import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document } from 'mongoose';

export type ZoneDocument = Zone & Document;

@Schema({ _id: false })
export class GeoPolygon {
  @Prop({ type: String, enum: ['Polygon'], default: 'Polygon' })
  type: string;

  @Prop({ type: [[[Number]]], required: true })
  coordinates: number[][][]; // GeoJSON Polygon: [[[lng, lat], [lng, lat], ...]]
}

export const GeoPolygonSchema = SchemaFactory.createForClass(GeoPolygon);

@Schema({ timestamps: true })
export class Zone {
  @Prop({ required: true, trim: true })
  name: string; // e.g., "Koramangala-HSR Hub"

  @Prop({ required: true, trim: true, index: true })
  city: string; // e.g., "Bengaluru"

  @Prop({ default: 'IN', trim: true })
  country: string;

  @Prop({ type: GeoPolygonSchema, required: true })
  boundary: GeoPolygon;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null })
  managerId?: mongoose.Types.ObjectId;

  @Prop({ default: 3500 }) // Base fee in Paise (e.g. ₹35.00)
  baseDeliveryFeeInPaise: number;

  @Prop({ default: 0 }) // Extra surge fee in Paise (e.g. ₹15.00 during rain/peak)
  surgeFeeInPaise: number;

  @Prop({ default: true })
  isActive: boolean;
}

export const ZoneSchema = SchemaFactory.createForClass(Zone);

// 2dsphere spatial index for high-performance point-in-polygon queries
ZoneSchema.index({ boundary: '2dsphere' });
ZoneSchema.index({ city: 1, isActive: 1 });
ZoneSchema.index({ managerId: 1 });
