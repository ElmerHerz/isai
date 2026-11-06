import { IsString, IsOptional, IsUUID, IsDateString, IsNumber, IsPositive, IsIn, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { emptyToUndefined } from '../../../../common/utils/empty-to-undefined.transform';

const PROJECT_STATUSES = ['active', 'completed', 'cancelled'] as const;

export class UpdateProjectDto {
  @ApiPropertyOptional({ example: 'Equipo de sonido' })
  @IsString() @IsOptional() @MaxLength(150)
  name?: string;

  @ApiPropertyOptional()
  @Transform(emptyToUndefined)
  @IsString() @IsOptional()
  description?: string;

  @ApiPropertyOptional({ example: 13000 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  @IsOptional()
  goalAmount?: number;

  @ApiPropertyOptional({ example: '2026-12-31' })
  @Transform(emptyToUndefined)
  @IsDateString() @IsOptional()
  targetDate?: string;

  @ApiPropertyOptional()
  @Transform(emptyToUndefined)
  @IsUUID('loose') @IsOptional()
  incomeAccountId?: string;

  @ApiPropertyOptional({
    description:
      'Caja propia del proyecto — si no se indica, se usa la caja por defecto de la sucursal',
  })
  @Transform(emptyToUndefined)
  @IsUUID('loose') @IsOptional()
  cashAccountId?: string;

  @ApiPropertyOptional({ enum: PROJECT_STATUSES })
  @IsIn(PROJECT_STATUSES)
  @IsOptional()
  status?: (typeof PROJECT_STATUSES)[number];
}
