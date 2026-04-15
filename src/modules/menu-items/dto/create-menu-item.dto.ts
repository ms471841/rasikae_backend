import { IsString, IsNotEmpty, IsOptional, IsNumber, IsBoolean, IsArray, ValidateNested, IsMongoId } from 'class-validator';
import { Type } from 'class-transformer';

class VariantDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsInt()
  @IsNotEmpty()
  price: number; // Stored in Paise (integers)
}

class AddonOptionDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsInt()
  @IsNotEmpty()
  price: number; // Stored in Paise (integers)
}

class AddonGroupDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsBoolean()
  @IsOptional()
  isRequired?: boolean;

  @IsBoolean()
  @IsOptional()
  isMultiple?: boolean;

  @IsNumber()
  @IsOptional()
  minSelections?: number;

  @IsInt()
  @IsOptional()
  maxSelections?: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AddonOptionDto)
  @IsNotEmpty()
  options: AddonOptionDto[];
}

export class CreateMenuItemDto {
  @IsMongoId()
  @IsNotEmpty()
  restaurantId: string;

  @IsMongoId()
  @IsNotEmpty()
  categoryId: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsInt()
  @IsNotEmpty()
  price: number; // Stored in Paise (integers)

  @IsInt()
  @IsOptional()
  discountPrice?: number; // Stored in Paise (integers)

  @IsString()
  @IsOptional()
  image?: string;

  @IsBoolean()
  @IsOptional()
  isAvailable?: boolean;

  @IsBoolean()
  @IsOptional()
  isVeg?: boolean;

  @IsBoolean()
  @IsOptional()
  isSpicy?: boolean;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => VariantDto)
  @IsOptional()
  variants?: VariantDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AddonGroupDto)
  @IsOptional()
  addonGroups?: AddonGroupDto[];
}
