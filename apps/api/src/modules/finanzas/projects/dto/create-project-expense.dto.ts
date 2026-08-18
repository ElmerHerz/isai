import { IsString, IsOptional, IsUUID, IsDateString, IsNumber, IsPositive } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { emptyToUndefined } from '../../../../common/utils/empty-to-undefined.transform';

export class CreateProjectExpenseDto {
  @ApiProperty({ description: 'Cuenta de GASTO contra la que se registra (ej. "5001 Compra de equipo")' })
  @IsUUID()
  accountId!: string;

  @ApiProperty({ example: 12500 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  amount!: number;

  @ApiProperty({ example: '2026-08-16' })
  @IsDateString()
  incurredAt!: string;

  @ApiPropertyOptional()
  @Transform(emptyToUndefined)
  @IsString() @IsOptional()
  notes?: string;
}
