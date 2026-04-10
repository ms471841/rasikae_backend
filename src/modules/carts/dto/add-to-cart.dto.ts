import { IsMongoId, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class AddToCartDto {
  @IsMongoId()
  @IsNotEmpty()
  userId: string; // Temporary until we integrate with auth context

  @IsMongoId()
  @IsNotEmpty()
  menuItemId: string;

  @IsNumber()
  @Min(1)
  @IsNotEmpty()
  quantity: number;

  @IsString()
  @IsOptional()
  variantName?: string;

  @IsString({ each: true })
  @IsOptional()
  addonNames?: string[];
}
