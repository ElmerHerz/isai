import { IsString, IsOptional, IsUUID, IsDateString } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { emptyToUndefined } from '../../../../common/utils/empty-to-undefined.transform';

export class CreatePeriodClosingDto {
  @ApiProperty({ example: 'uuid-de-la-institución' })
  @IsUUID('loose')
  institutionId!: string;

  @ApiPropertyOptional({ description: 'Sucursal a la que aplica — vacío = toda la institución' })
  @Transform(emptyToUndefined)
  @IsUUID('loose') @IsOptional()
  branchId?: string;

  @ApiProperty({ example: '2026-12-31', description: 'Se cierra todo lo contabilizado hasta e incluyendo esta fecha' })
  @IsDateString()
  closedThroughDate!: string;

  @ApiProperty({ example: 'uuid-de-la-cuenta-de-patrimonio' })
  @IsUUID('loose')
  targetEquityAccountId!: string;

  @ApiPropertyOptional()
  @Transform(emptyToUndefined)
  @IsString() @IsOptional()
  notes?: string;
}
