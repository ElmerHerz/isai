import { IsString, IsOptional, IsBoolean, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateProductCategoryDto {
  @ApiPropertyOptional()
  @IsString() @IsOptional() @MaxLength(100)
  name?: string;

  @ApiPropertyOptional()
  @IsBoolean() @IsOptional()
  isActive?: boolean;
}
