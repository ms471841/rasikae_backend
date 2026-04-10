import { IsEnum, IsMongoId, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { VehicleType } from '../schemas/driver.schema';

export class CreateDriverDto {
  @IsMongoId()
  @IsNotEmpty()
  userId: string;

  @IsEnum(VehicleType)
  @IsNotEmpty()
  vehicleType: VehicleType;

  @IsString()
  @IsOptional()
  licensePlate?: string;
}
