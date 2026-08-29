import { IsString, IsOptional, IsUUID, IsDateString, IsNumber, IsPositive, IsIn } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { emptyToUndefined } from '../../../../common/utils/empty-to-undefined.transform';

export class CreateGroupFundMovementDto {
  @ApiProperty({ enum: ['income', 'expense'] })
  @IsIn(['income', 'expense'])
  type!: 'income' | 'expense';

  @ApiProperty({ description: 'Cuenta de INGRESO (si type=income) o de GASTO (si type=expense)' })
  @IsUUID('loose')
  accountId!: string;

  @ApiProperty({ example: 45.5 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  amount!: number;

  @ApiProperty({ example: '2026-08-16' })
  @IsDateString()
  movementDate!: string;

  @ApiPropertyOptional({ description: 'Requerida solo si el grupo no tiene sucursal propia (branchId null)' })
  @Transform(emptyToUndefined)
  @IsUUID('loose') @IsOptional()
  branchId?: string;

  @ApiPropertyOptional()
  @Transform(emptyToUndefined)
  @IsString() @IsOptional()
  notes?: string;
}
