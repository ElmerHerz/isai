import { IsString, IsNotEmpty, IsOptional, IsUUID, IsBoolean, IsNumber, Min, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { emptyToUndefined } from '../../../../common/utils/empty-to-undefined.transform';

export class CreateProductDto {
  @ApiPropertyOptional({ description: 'Código propio del negocio' })
  @Transform(emptyToUndefined)
  @IsString() @IsOptional() @MaxLength(50)
  sku?: string;

  @ApiPropertyOptional({ description: 'UPC/EAN impreso de fábrica' })
  @Transform(emptyToUndefined)
  @IsString() @IsOptional() @MaxLength(64)
  barcode?: string;

  @ApiProperty({ example: 'Martillo 16oz' })
  @IsString() @IsNotEmpty() @MaxLength(150)
  name!: string;

  @ApiPropertyOptional()
  @Transform(emptyToUndefined)
  @IsString() @IsOptional()
  description?: string;

  @ApiPropertyOptional({ description: 'Categoría — vacío = sin categoría' })
  @Transform(emptyToUndefined)
  @IsUUID('loose') @IsOptional()
  categoryId?: string;

  @ApiProperty({ example: 'UNIT', description: 'Código de general.catalog_items, catalog_code=product_unit' })
  @IsString() @IsNotEmpty()
  unitCode!: string;

  @ApiPropertyOptional({ description: 'Vacío = este producto nunca se vende, solo uso interno' })
  @Transform(emptyToUndefined)
  @IsNumber() @Min(0) @IsOptional()
  salePrice?: number;

  @ApiPropertyOptional({ default: true })
  @IsBoolean() @IsOptional()
  tracksInventory?: boolean;
}
