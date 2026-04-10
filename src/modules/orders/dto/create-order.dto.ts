import { IsMongoId, IsNotEmpty, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class AddressDto {
  @IsString()
  @IsNotEmpty()
  street: string;

  @IsString()
  @IsNotEmpty()
  city: string;

  @IsString()
  @IsNotEmpty()
  state: string;

  @IsString()
  @IsNotEmpty()
  zipCode: string;
}

export class CheckoutDto {
  @IsMongoId()
  @IsNotEmpty()
  userId: string; // Temporarily passed in body until auth is fully integrated

  @ValidateNested()
  @Type(() => AddressDto)
  @IsNotEmpty()
  deliveryAddress: AddressDto;

  @IsString()
  @IsNotEmpty()
  paymentMethod: string;
}
