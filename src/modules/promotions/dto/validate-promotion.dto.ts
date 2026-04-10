import { IsString, IsNotEmpty, IsNumber, IsMongoId, IsOptional } from 'class-validator';

export class ValidatePromotionDto {
  @IsString()
  @IsNotEmpty()
  code: string;

  @IsNumber()
  @IsNotEmpty()
  cartTotal: number;

  @IsMongoId()
  @IsOptional()
  restaurantId?: string;

  @IsMongoId()
  @IsNotEmpty()
  userId: string;
}
