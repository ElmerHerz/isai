import { IsString, IsOptional, IsDateString, IsIn, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { emptyToUndefined } from '../../../../common/utils/empty-to-undefined.transform';

const BUDGET_STATUSES = ['draft', 'active', 'closed'] as const;

export class UpdateBudgetDto {
  @ApiPropertyOptional({ example: 'Presupuesto 2027' })
  @IsString() @IsOptional() @MaxLength(150)
  name?: string;

  @ApiPropertyOptional({ example: '2027-01-01' })
  @IsDateString() @IsOptional()
  periodStart?: string;

  @ApiPropertyOptional({ example: '2027-12-31' })
  @IsDateString() @IsOptional()
  periodEnd?: string;

  @ApiPropertyOptional()
  @Transform(emptyToUndefined)
  @IsString() @IsOptional()
  notes?: string;

  @ApiPropertyOptional({ enum: BUDGET_STATUSES })
  @IsIn(BUDGET_STATUSES)
  @IsOptional()
  status?: (typeof BUDGET_STATUSES)[number];
}
