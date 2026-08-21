import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document } from 'mongoose';

export type VendorDocument = Vendor & Document;

@Schema({ timestamps: true })
export class Vendor {
  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
  })
  userId: mongoose.Types.ObjectId;

  @Prop({ required: true })
  businessName: string;

  @Prop()
  fssaiNumber?: string;

  @Prop()
  gstNumber?: string;

  @Prop({
    default: 'PENDING',
    enum: ['PENDING', 'VERIFIED', 'REJECTED', 'SUSPENDED'],
  })
  verificationStatus: string;

  @Prop()
  rejectionReason?: string;

  @Prop({
    type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant' }],
    default: [],
  })
  restaurants: mongoose.Types.ObjectId[];

  @Prop({ default: true })
  isActive: boolean;

  createdAt: Date;
  updatedAt: Date;
}

export const VendorSchema = SchemaFactory.createForClass(Vendor);
