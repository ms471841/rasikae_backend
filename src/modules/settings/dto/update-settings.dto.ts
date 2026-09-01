import {
  IsString,
  IsNumber,
  IsBoolean,
  IsOptional,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

class SupportContactDto {
  @IsString()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  phone?: string;
}

export class FAQItemDto {
  @IsString()
  @IsOptional()
  _id?: string;

  @IsString()
  question: string;

  @IsString()
  answer: string;

  @IsString()
  @IsOptional()
  category?: string;

  @IsNumber()
  @IsOptional()
  order?: number;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class UpdateSettingsDto {
  @IsNumber()
  @IsOptional()
  deliveryBaseFee?: number;

  @IsNumber()
  @IsOptional()
  taxPercentage?: number;

  @IsNumber()
  @IsOptional()
  minOrderValue?: number;

  @IsBoolean()
  @IsOptional()
  isMaintenanceMode?: boolean;

  @IsString()
  @IsOptional()
  maintenanceMessage?: string;

  @IsString()
  @IsOptional()
  appVersion?: string;

  @IsNumber()
  @IsOptional()
  platformCommissionPercentage?: number;

  @ValidateNested()
  @Type(() => SupportContactDto)
  @IsOptional()
  supportContact?: SupportContactDto;

  // ─── Legal & CMS Static Content ──────────────────────────────────────────
  @IsString()
  @IsOptional()
  termsAndConditions?: string;

  @IsString()
  @IsOptional()
  privacyPolicy?: string;

  @IsString()
  @IsOptional()
  aboutUs?: string;

  @IsString()
  @IsOptional()
  refundPolicy?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FAQItemDto)
  @IsOptional()
  faqs?: FAQItemDto[];
}

