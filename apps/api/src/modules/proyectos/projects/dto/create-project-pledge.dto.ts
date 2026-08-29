import { IsString, IsOptional, IsUUID, IsDateString, IsNumber, IsPositive, IsIn } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { emptyToUndefined } from '../../../../common/utils/empty-to-undefined.transform';

// Exactamente uno de personId/groupId — mismo XOR que CreateProjectContributionDto.
export class CreateProjectPledgeDto {
  @ApiPropertyOptional({ description: 'Promesa de una persona (miembro o externo) — XOR con groupId' })
  @Transform(emptyToUndefined)
  @IsUUID('loose') @IsOptional()
  personId?: string;

  @ApiPropertyOptional({ description: 'Promesa "como grupo" — XOR con personId' })
  @Transform(emptyToUndefined)
  @IsUUID('loose') @IsOptional()
  groupId?: string;

  @ApiProperty({ example: 200 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  amount!: number;

  @ApiPropertyOptional({ enum: ['once', 'monthly', 'weekly'], default: 'once' })
  @IsIn(['once', 'monthly', 'weekly'])
  @IsOptional()
  frequency?: 'once' | 'monthly' | 'weekly';

  @ApiPropertyOptional({ description: 'Para cuándo se comprometió (o el último pago esperado, si es recurrente)' })
  @Transform(emptyToUndefined)
  @IsDateString() @IsOptional()
  expectedDate?: string;

  @ApiPropertyOptional()
  @Transform(emptyToUndefined)
  @IsString() @IsOptional()
  notes?: string;
}
