import { IsString, IsNotEmpty, IsOptional, IsUUID, IsInt, Min, IsNumber, IsDateString, IsIn, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { emptyToUndefined } from '../../../../common/utils/empty-to-undefined.transform';

const SOURCE_TYPES = ['project_expense', 'group_fund_expense'] as const;

export class CreateAssetDto {
  @ApiProperty({ example: 'uuid-de-la-institución' })
  @IsUUID('loose')
  institutionId!: string;

  @ApiPropertyOptional({ description: 'Vacío = toda la institución' })
  @Transform(emptyToUndefined)
  @IsUUID('loose') @IsOptional()
  branchId?: string;

  @ApiProperty({ example: 'Bocina JBL EON615' })
  @IsString() @IsNotEmpty() @MaxLength(150)
  name!: string;

  @ApiPropertyOptional({ example: 'Audio' })
  @Transform(emptyToUndefined)
  @IsString() @IsOptional() @MaxLength(30)
  categoryCode?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsInt() @Min(1) @IsOptional()
  quantity?: number;

  @ApiPropertyOptional()
  @Transform(emptyToUndefined)
  @IsString() @IsOptional() @MaxLength(100)
  serialNumber?: string;

  @ApiPropertyOptional({ example: '2026-01-15' })
  @Transform(emptyToUndefined)
  @IsDateString() @IsOptional()
  acquisitionDate?: string;

  @ApiPropertyOptional({ description: 'Solo referencia, no genera asiento contable' })
  @IsNumber() @Min(0) @IsOptional()
  acquisitionCost?: number;

  @ApiPropertyOptional({ description: 'Ubicación física, ej. "Bodega principal"' })
  @Transform(emptyToUndefined)
  @IsString() @IsOptional() @MaxLength(150)
  location?: string;

  @ApiPropertyOptional({ enum: SOURCE_TYPES, description: 'De qué gasto salió — opcional, solo referencia' })
  @IsIn(SOURCE_TYPES) @IsOptional()
  sourceType?: (typeof SOURCE_TYPES)[number];

  @ApiPropertyOptional()
  @IsUUID('loose') @IsOptional()
  sourceId?: string;

  @ApiPropertyOptional()
  @Transform(emptyToUndefined)
  @IsString() @IsOptional()
  notes?: string;
}
