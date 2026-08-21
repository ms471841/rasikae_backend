import { PartialType, OmitType } from '@nestjs/mapped-types';
import { CreateAddressDto } from './create-address.dto';

// Prevent reassignment of userId during updates
export class UpdateAddressDto extends PartialType(
  OmitType(CreateAddressDto, ['userId'] as const),
) {
  isDefault?: boolean;
}
