import { IsString, IsNotEmpty, IsOptional, IsUUID, IsDateString, IsIn, IsArray, ArrayMinSize, ArrayMaxSize, ValidateNested, IsNumber, IsPositive, Min } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { emptyToUndefined } from '../../../../common/utils/empty-to-undefined.transform';

const PAYMENT_METHODS = ['cash', 'transfer', 'card', 'credit'] as const;
const DOCUMENT_TYPES = ['invoice', 'receipt'] as const;

export class CreateSaleLineDto {
  @ApiProperty({ example: 'uuid-del-producto' })
  @IsUUID('loose')
  productId!: string;

  @ApiProperty({ example: 10 })
  @IsNumber() @IsPositive()
  quantity!: number;

  @ApiProperty({ example: 2.5 })
  @IsNumber() @Min(0)
  unitPrice!: number;
}

// A diferencia de CreatePurchaseDto (solo encabezado, líneas se agregan
// después una a la vez), acá viene TODO junto — una Venta nace atómica
// (ver SalesService.create): encabezado + carrito completo en un solo POST.
export class CreateSaleDto {
  @ApiProperty({ example: 'uuid-de-la-institución' })
  @IsUUID('loose')
  institutionId!: string;

  @ApiProperty({ example: 'uuid-de-la-sucursal' })
  @IsUUID('loose')
  branchId!: string;

  @ApiPropertyOptional({ description: 'Vacío = Consumidor Final' })
  @Transform(emptyToUndefined)
  @IsUUID('loose') @IsOptional()
  customerId?: string;

  @ApiProperty({ example: '2026-08-29' })
  @IsDateString()
  saleDate!: string;

  @ApiProperty({ enum: PAYMENT_METHODS })
  @IsIn(PAYMENT_METHODS)
  paymentMethod!: (typeof PAYMENT_METHODS)[number];

  @ApiProperty({ enum: DOCUMENT_TYPES })
  @IsIn(DOCUMENT_TYPES)
  documentType!: (typeof DOCUMENT_TYPES)[number];

  @ApiPropertyOptional()
  @Transform(emptyToUndefined)
  @IsString() @IsOptional()
  notes?: string;

  @ApiProperty({ type: [CreateSaleLineDto] })
  @IsArray() @ArrayMinSize(1) @ArrayMaxSize(200)
  @ValidateNested({ each: true })
  @Type(() => CreateSaleLineDto)
  lines!: CreateSaleLineDto[];
}
