import { IsNumber, IsNotEmpty, Min, IsMongoId } from 'class-validator';

export class UpdateCartItemDto {
  @IsMongoId()
  @IsNotEmpty()
  userId: string; // Temporary until connected with auth user context

  @IsNumber()
  @Min(1)
  @IsNotEmpty()
  quantity: number;
}
