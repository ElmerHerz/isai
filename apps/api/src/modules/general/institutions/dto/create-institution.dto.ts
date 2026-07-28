import { IsString, IsNotEmpty, MaxLength, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateInstitutionDto {
  @ApiProperty({ example: 'church', description: 'Código de institution_types (church, store, pharmacy, nursing_home, generic)' })
  @IsString() @IsNotEmpty() @MaxLength(30)
  typeCode!: string;

  @ApiProperty({ example: 'Instituto Principal' })
  @IsString() @IsNotEmpty() @MaxLength(150)
  name!: string;

  @ApiPropertyOptional({ example: true })
  @IsBoolean() @IsOptional()
  isActive?: boolean;
}
