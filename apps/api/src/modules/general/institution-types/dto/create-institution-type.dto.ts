import { IsString, IsNotEmpty, Length, Matches, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateInstitutionTypeDto {
  @ApiProperty({ example: 'CHURCH', description: 'Código único, MAYUSCULAS_CON_GUION_BAJO' })
  @IsString() @IsNotEmpty() @Length(1, 30)
  @Matches(/^[A-Z0-9_]+$/, { message: 'code debe ser MAYUSCULAS_CON_GUION_BAJO' })
  code!: string;

  @ApiProperty({ example: 'Iglesia' })
  @IsString() @IsNotEmpty() @Length(1, 100)
  name!: string;

  @ApiPropertyOptional({ example: 'Instituciones religiosas con una o más sedes' })
  @IsString() @IsOptional()
  description?: string;
}
