import { IsString, IsOptional, IsUUID, IsBoolean, IsNumber, Min, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

// Nota: a diferencia de CreateProductDto, acá NO se usa
// @Transform(emptyToUndefined) en los campos nullable — Prisma trata
// `undefined` en `data` como "no tocar este campo" (no como "poner null"),
// así que si el frontend manda "" y esta clase la convirtiera a `undefined`,
// nunca sería posible limpiar un SKU/categoría/etc. ya guardado (quedaría
// silenciosamente con el valor viejo). El frontend manda `null` explícito
// para "limpiar" — con @IsOptional(), class-validator ya deja pasar `null`
// sin más validación, y Prisma sí lo traduce a NULL real en la columna.
export class UpdateProductDto {
  @ApiPropertyOptional()
  @IsString() @IsOptional() @MaxLength(50)
  sku?: string | null;

  @ApiPropertyOptional()
  @IsString() @IsOptional() @MaxLength(64)
  barcode?: string | null;

  @ApiPropertyOptional()
  @IsString() @IsOptional() @MaxLength(150)
  name?: string;

  @ApiPropertyOptional()
  @IsString() @IsOptional()
  description?: string | null;

  @ApiPropertyOptional({ description: 'null = sin categoría' })
  @IsUUID('loose') @IsOptional()
  categoryId?: string | null;

  @ApiPropertyOptional()
  @IsString() @IsOptional()
  unitCode?: string;

  @ApiPropertyOptional({ description: 'null = este producto nunca se vende, solo uso interno' })
  @IsNumber() @Min(0) @IsOptional()
  salePrice?: number | null;

  @ApiPropertyOptional()
  @IsBoolean() @IsOptional()
  tracksInventory?: boolean;

  @ApiPropertyOptional()
  @IsBoolean() @IsOptional()
  isActive?: boolean;
}
