import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsBoolean,
  ValidateNested,
  IsArray,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class GeoPolygonDto {
  @IsString()
  @IsOptional()
  type: string = 'Polygon';

  @IsArray()
  @IsNotEmpty()
  coordinates: number[][][];
}

export class CreateZoneDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  city: string;

  @IsString()
  @IsOptional()
  country?: string;

  @ValidateNested()
  @Type(() => GeoPolygonDto)
  @IsNotEmpty()
  boundary: GeoPolygonDto;

  @IsString()
  @IsOptional()
  managerId?: string;

  @IsNumber()
  @IsOptional()
  @Min(0)
  baseDeliveryFeeInPaise?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  surgeFeeInPaise?: number;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
