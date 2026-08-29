import { IsString, IsNotEmpty, IsOptional, IsUUID, IsDateString, IsNumber, IsPositive, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { emptyToUndefined } from '../../../../common/utils/empty-to-undefined.transform';

export class CreateProjectDto {
  @ApiProperty({ example: 'uuid-de-la-institución' })
  @IsUUID('loose')
  institutionId!: string;

  @ApiProperty({ description: 'Sucursal cuya Caja recibe los aportes — obligatoria aunque el proyecto sea para toda la institución' })
  @IsUUID('loose')
  branchId!: string;

  @ApiProperty({ example: 'Equipo de sonido' })
  @IsString() @IsNotEmpty() @MaxLength(150)
  name!: string;

  @ApiPropertyOptional()
  @Transform(emptyToUndefined)
  @IsString() @IsOptional()
  description?: string;

  @ApiProperty({ example: 13000 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  goalAmount!: number;

  @ApiPropertyOptional({ example: '2026-12-31' })
  @Transform(emptyToUndefined)
  @IsDateString() @IsOptional()
  targetDate?: string;

  @ApiPropertyOptional({ description: 'Cuenta de ingreso a la que se contabilizan sus aportes — se puede configurar después' })
  @Transform(emptyToUndefined)
  @IsUUID('loose') @IsOptional()
  incomeAccountId?: string;
}
