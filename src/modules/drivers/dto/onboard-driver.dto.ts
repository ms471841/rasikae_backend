import { IsEmail, IsEnum, IsNotEmpty, IsString, MinLength } from 'class-validator';
import { VehicleType } from '../schemas/driver.schema';

export class OnboardDriverDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password: string;

  @IsString()
  @IsNotEmpty()
  phone: string;

  @IsEnum(VehicleType)
  @IsNotEmpty()
  vehicleType: VehicleType;

  @IsString()
  @IsNotEmpty()
  licensePlate: string;
}
