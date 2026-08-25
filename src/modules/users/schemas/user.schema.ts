import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document } from 'mongoose';

export type UserDocument = User & Document;

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true, unique: true })
  firebaseUid: string;

  @Prop({ required: true })
  name: string;

  @Prop()
  email?: string;

  @Prop()
  phone?: string;

  @Prop()
  avatarUrl?: string;

  @Prop()
  preference?: string;

  @Prop({
    default: 'customer',
    enum: ['customer', 'admin', 'sub_admin', 'vendor', 'driver'],
  })
  role: string;

  @Prop({
    type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Zone' }],
    default: [],
  })
  assignedZones: mongoose.Types.ObjectId[];

  @Prop({
    type: {
      canManageOrders: { type: Boolean, default: true },
      canApproveRestaurants: { type: Boolean, default: true },
      canManageDrivers: { type: Boolean, default: true },
      canViewFinancials: { type: Boolean, default: false },
      canTriggerSurge: { type: Boolean, default: true },
    },
    default: {
      canManageOrders: true,
      canApproveRestaurants: true,
      canManageDrivers: true,
      canViewFinancials: false,
      canTriggerSurge: true,
    },
    _id: false,
  })
  permissions: {
    canManageOrders: boolean;
    canApproveRestaurants: boolean;
    canManageDrivers: boolean;
    canViewFinancials: boolean;
    canTriggerSurge: boolean;
  };

  @Prop({ type: [String], default: [] })
  fcmTokens: string[];

  @Prop({
    type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant' }],
    default: [],
  })
  favorites: mongoose.Types.ObjectId[];

  @Prop({ default: 0 })
  totalOrders: number;

  @Prop({ default: 0 })
  ltv: number; // Stored in Paise (integers)

  @Prop()
  lastOrderDate?: Date;

  @Prop({ default: true })
  isActive: boolean;

  createdAt: Date;
  updatedAt: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);

UserSchema.index({ email: 1 }, { sparse: true });
UserSchema.index({ phone: 1 }, { sparse: true });
UserSchema.index({ role: 1 });
UserSchema.index({ createdAt: -1 });
