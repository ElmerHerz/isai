import { IsString, IsOptional, IsUUID, IsInt, Min, IsNumber, IsDateString, IsIn, IsBoolean, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

const SOURCE_TYPES = ['project_expense', 'group_fund_expense'] as const;

// null (no undefined) en los campos nullable — Prisma trata `undefined` como
// "no tocar" y `null` como "limpiar" — mismo criterio corregido en
// UpdateProductDto tras el bug real de la Rebanada 2 (ver plan de sesión).
export class UpdateAssetDto {
  @ApiPropertyOptional()
  @IsString() @IsOptional() @MaxLength(150)
  name?: string;

  @ApiPropertyOptional()
  @IsString() @IsOptional() @MaxLength(30)
  categoryCode?: string | null;

  @ApiPropertyOptional()
  @IsInt() @Min(1) @IsOptional()
  quantity?: number;

  @ApiPropertyOptional()
  @IsString() @IsOptional() @MaxLength(100)
  serialNumber?: string | null;

  @ApiPropertyOptional()
  @IsDateString() @IsOptional()
  acquisitionDate?: string | null;

  @ApiPropertyOptional()
  @IsNumber() @Min(0) @IsOptional()
  acquisitionCost?: number | null;

  @ApiPropertyOptional({ enum: SOURCE_TYPES })
  @IsIn(SOURCE_TYPES) @IsOptional()
  sourceType?: (typeof SOURCE_TYPES)[number] | null;

  @ApiPropertyOptional()
  @IsUUID('loose') @IsOptional()
  sourceId?: string | null;

  @ApiPropertyOptional()
  @IsString() @IsOptional()
  notes?: string | null;

  @ApiPropertyOptional()
  @IsBoolean() @IsOptional()
  isActive?: boolean;
}
