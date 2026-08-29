import { IsString, IsNotEmpty, IsOptional, IsNumber, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateProductUnitDto {
  @ApiProperty({ example: 'FARDO', description: 'Código de general.catalog_items, catalog_code=product_unit' })
  @IsString() @IsNotEmpty()
  unitCode!: string;

  @ApiProperty({ example: 36, description: 'Cuántas unitCode base (Product.unitCode) trae 1 de esta presentación' })
  @IsNumber() @Min(0.001)
  conversionToBase!: number;

  @ApiPropertyOptional({ description: 'Vacío = esta presentación no se vende entera, solo se compra' })
  @IsNumber() @Min(0) @IsOptional()
  salePrice?: number;
}
