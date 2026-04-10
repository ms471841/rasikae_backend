import { IsArray, IsNumber, ArrayMinSize, ArrayMaxSize } from 'class-validator';

export class UpdateLocationDto {
  @IsArray()
  @IsNumber({}, { each: true })
  @ArrayMinSize(2)
  @ArrayMaxSize(2)
  coordinates: number[]; // [longitude, latitude]
}
