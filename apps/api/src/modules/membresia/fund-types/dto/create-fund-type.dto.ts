import { IsBoolean, IsOptional, IsString, Matches, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateFundTypeDto {
  @ApiProperty({ example: 'OFRENDA' })
  @IsString()
  @MaxLength(50)
  @Matches(/^[A-Z0-9_]+$/, { message: 'El código solo puede tener mayúsculas, números y guion bajo' })
  code!: string;

  @ApiProperty({ example: 'Ofrenda' })
  @IsString()
  @MaxLength(100)
  name!: string;

  @ApiPropertyOptional({ description: 'Permite identificar donantes por nombre en las colectas de este tipo de fondo' })
  @IsBoolean()
  @IsOptional()
  tracksDonors?: boolean;
}
