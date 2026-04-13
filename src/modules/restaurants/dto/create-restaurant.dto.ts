import { IsNotEmpty, IsString, IsOptional, IsBoolean, IsArray, ValidateNested, IsIn, IsNumber, IsMongoId } from 'class-validator';
import { Type } from 'class-transformer';

class LocationDto {
  @IsString()
  @IsIn(['Point'])
  @IsOptional()
  type?: string;

  @IsArray()
  @IsNotEmpty()
  coordinates: number[];
}

class OperatingHoursDto {
  @IsString()
  @IsNotEmpty()
  open: string;

  @IsString()
  @IsNotEmpty()
  close: string;
}

export class CreateRestaurantDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  logo?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  coverImages?: string[];

  @IsArray()
  @IsMongoId({ each: true })
  @IsOptional()
  categories?: string[];

  @IsArray()
  @IsMongoId({ each: true })
  @IsOptional()
  cuisines?: string[];

  @IsNumber()
  @IsOptional()
  deliveryTime?: number;

  @IsBoolean()
  @IsOptional()
  isFeatured?: boolean;

  @IsBoolean()
  @IsOptional()
  isFreeDelivery?: boolean;

  @IsBoolean()
  @IsOptional()
  isVeg?: boolean;

  @IsNumber()
  @IsOptional()
  rating?: number;

  @IsNumber()
  @IsOptional()
  ratingSum?: number;

  @IsNumber()
  @IsOptional()
  ratingCount?: number;

  @ValidateNested()
  @Type(() => LocationDto)
  @IsOptional()
  location?: LocationDto;

  @IsString()
  @IsOptional()
  address?: string;

  @IsString()
  @IsOptional()
  city?: string;

  @ValidateNested()
  @Type(() => OperatingHoursDto)
  @IsOptional()
  operatingHours?: OperatingHoursDto;
}
