import { IsInt, Min, IsNotEmpty, IsString, IsOptional } from 'class-validator';

export class WithdrawDto {
  @IsInt()
  @Min(50000) // Minimum ₹500 (50,000 Paise)
  @IsNotEmpty()
  amount: number;

  @IsString()
  @IsOptional()
  description?: string;
}
