import { IsMongoId, IsNotEmpty } from 'class-validator';

export class AssignDriverDto {
  @IsMongoId()
  @IsNotEmpty()
  driverId: string;
}
