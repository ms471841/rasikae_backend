import { IsMongoId, IsNotEmpty } from 'class-validator';

export class MarkDeliveredDto {
  @IsMongoId()
  @IsNotEmpty()
  driverId: string; // Temporarily passed until auth context carries the driver's identity
}
