import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateFundTypeDto {
  @ApiPropertyOptional({ example: 'Ofrenda' })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Permite identificar donantes por nombre en las colectas de este tipo de fondo' })
  @IsBoolean()
  @IsOptional()
  tracksDonors?: boolean;
}
