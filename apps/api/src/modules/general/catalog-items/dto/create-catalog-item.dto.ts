import { IsString, IsNotEmpty, Length, Matches, IsInt, IsOptional, IsBoolean, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCatalogItemDto {
  @ApiProperty({ example: 'schedule_type', description: 'Discriminador del catálogo, snake_case' })
  @IsString() @IsNotEmpty() @Length(1, 50)
  @Matches(/^[a-z0-9_]+$/, { message: 'catalogCode debe ser snake_case en minúsculas' })
  catalogCode!: string;

  @ApiProperty({ example: 'VIGIL', description: 'Código único dentro de catalogCode' })
  @IsString() @IsNotEmpty() @Length(1, 50)
  @Matches(/^[A-Z0-9_]+$/, { message: 'code debe ser MAYUSCULAS_CON_GUION_BAJO' })
  code!: string;

  @ApiProperty({ example: 'Vigilia' })
  @IsString() @IsNotEmpty() @Length(1, 100)
  name!: string;

  @ApiPropertyOptional({ example: 1 })
  @IsInt() @Min(0) @IsOptional()
  sortOrder?: number;

  @ApiPropertyOptional({ example: true })
  @IsBoolean() @IsOptional()
  isActive?: boolean;
}
