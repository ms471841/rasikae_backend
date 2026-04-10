import { IsNotEmpty, IsString, IsOptional, IsBoolean } from 'class-validator';

export class CreateCuisineDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
