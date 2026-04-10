import { PartialType } from '@nestjs/mapped-types';
import { CreateRestaurantDto } from './create-restaurant.dto';
import { IsOptional, IsString, IsBoolean, IsIn } from 'class-validator';

export class UpdateRestaurantDto extends PartialType(CreateRestaurantDto) {
  @IsString()
  @IsIn(['pending', 'approved', 'rejected'])
  @IsOptional()
  status?: string;

  @IsBoolean()
  @IsOptional()
  isPublished?: boolean;
}
