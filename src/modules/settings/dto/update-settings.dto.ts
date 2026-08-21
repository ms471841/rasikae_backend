import {
  IsString,
  IsNumber,
  IsBoolean,
  IsOptional,
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
}
