import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsNumber,
  Min,
  Max,
  IsArray,
  IsMongoId,
} from 'class-validator';
import { TargetType } from '../schemas/review.schema';

export class CreateReviewDto {
  @IsMongoId()
  @IsOptional()
  userId?: string;

  @IsMongoId()
  @IsNotEmpty()
  orderId: string;

  @IsEnum(TargetType)
  @IsNotEmpty()
  targetType: TargetType;

  @IsMongoId()
  @IsNotEmpty()
  targetId: string;

  @IsNumber()
  @Min(1)
  @Max(5)
  @IsNotEmpty()
  rating: number;

  @IsString()
  @IsOptional()
  comment?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  images?: string[];
}
