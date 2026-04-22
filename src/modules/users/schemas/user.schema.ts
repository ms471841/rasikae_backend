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

  @Prop({ default: 'customer', enum: ['customer', 'admin', 'vendor', 'driver'] })
  role: string;

  @Prop({ type: [String], default: [] })
  fcmTokens: string[];

  @Prop({ type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant' }], default: [] })
  favorites: mongoose.Types.ObjectId[];

  @Prop({ default: 0 })
  totalOrders: number;

  @Prop({ default: 0 })
  ltv: number; // Stored in Paise (integers)

  @Prop()
  lastOrderDate?: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);
