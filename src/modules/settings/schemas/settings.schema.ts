import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type SettingsDocument = Settings & Document;

@Schema({ _id: false })
class SupportContact {
  @Prop({ default: 'support@rasikae.com' })
  email: string;

  @Prop({ default: '+910000000000' })
  phone: string;
}

const SupportContactSchema = SchemaFactory.createForClass(SupportContact);

@Schema({ timestamps: true })
export class Settings {
  @Prop({ default: 'GLOBAL_CONFIG' })
  configId: string; // Used as a singleton key

  @Prop({ default: 4000 }) // Default 4000 Paise (₹40)
  deliveryBaseFee: number;

  @Prop({ default: 0.05 })
  taxPercentage: number;

  @Prop({ default: 0 }) // Stored in Paise (integers)
  minOrderValue: number;

  @Prop({ default: false })
  isMaintenanceMode: boolean;

  @Prop({
    default:
      'Our kitchen is currently undergoing maintenance. We will be back soon!',
  })
  maintenanceMessage: string;

  @Prop({ default: '1.0.0' })
  appVersion: string;

  @Prop({ default: 0.1 }) // Default 10%
  platformCommissionPercentage: number;

  @Prop({ type: SupportContactSchema, default: {} })
  supportContact: SupportContact;
}

export const SettingsSchema = SchemaFactory.createForClass(Settings);
