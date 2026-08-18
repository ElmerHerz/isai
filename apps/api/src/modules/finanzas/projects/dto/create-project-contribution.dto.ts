import { IsString, IsOptional, IsUUID, IsDateString, IsNumber, IsPositive } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { emptyToUndefined } from '../../../../common/utils/empty-to-undefined.transform';

// Exactamente uno de personId/groupId — el XOR se valida en el service
// (mismo criterio que general.addresses, no hay forma limpia de expresarlo
// solo con decoradores de class-validator).
export class CreateProjectContributionDto {
  @ApiPropertyOptional({ description: 'Aporte de una persona (miembro o externo) — XOR con groupId' })
  @Transform(emptyToUndefined)
  @IsUUID() @IsOptional()
  personId?: string;

  @ApiPropertyOptional({ description: 'Aporte "como grupo" — XOR con personId' })
  @Transform(emptyToUndefined)
  @IsUUID() @IsOptional()
  groupId?: string;

  @ApiProperty({ example: 200 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  amount!: number;

  @ApiProperty({ example: '2026-08-16' })
  @IsDateString()
  contributedAt!: string;

  @ApiPropertyOptional()
  @Transform(emptyToUndefined)
  @IsString() @IsOptional()
  notes?: string;
}
