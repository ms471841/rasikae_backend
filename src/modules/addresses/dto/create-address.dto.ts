import { IsString, IsNotEmpty, IsOptional, IsBoolean, IsEnum, IsArray, ArrayMinSize, ArrayMaxSize, ValidateNested, IsMongoId } from 'class-validator';
import { Type } from 'class-transformer';
import { AddressLabel } from '../schemas/address.schema';

class LocationDto {
  @IsString()
  @IsOptional()
  type?: string;

  @IsArray()
  @ArrayMinSize(2)
  @ArrayMaxSize(2)
  coordinates: number[]; // [longitude, latitude]
}

export class CreateAddressDto {
  @IsMongoId()
  @IsNotEmpty()
  userId: string;

  @IsEnum(AddressLabel)
  @IsNotEmpty()
  label: AddressLabel;

  @IsString()
  @IsNotEmpty()
  street: string;

  @IsString()
  @IsNotEmpty()
  city: string;

  @IsString()
  @IsOptional()
  state?: string;

  @IsString()
  @IsOptional()
  postalCode?: string;

  @ValidateNested()
  @Type(() => LocationDto)
  @IsNotEmpty()
  location: LocationDto;

  @IsString()
  @IsOptional()
  additionalDetails?: string;

  @IsString()
  @IsOptional()
  receiverName?: string;

  @IsString()
  @IsOptional()
  receiverPhone?: string;

  @IsBoolean()
  @IsOptional()
  isDefault?: boolean;
}
