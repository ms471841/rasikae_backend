import { IsNumber, IsNotEmpty, Min } from 'class-validator';

export class UpdateCartItemDto {
  @IsNumber()
  @Min(1)
  @IsNotEmpty()
  quantity: number;
}
