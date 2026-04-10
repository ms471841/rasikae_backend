import { IsBoolean, IsNotEmpty } from 'class-validator';

export class UpdateDriverStatusDto {
  @IsBoolean()
  @IsNotEmpty()
  isAvailable: boolean;
}
