import { IsString, IsNotEmpty, IsOptional, IsBoolean } from 'class-validator';

export class CreateContentDto {
  @IsString()
  @IsNotEmpty()
  slug: string;

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsOptional()
  content?: string;

  @IsBoolean()
  @IsOptional()
  isPublished?: boolean;

  @IsString()
  @IsOptional()
  metaDescription?: string;
}
