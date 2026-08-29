import { IsString, IsNotEmpty, IsOptional, IsUUID, IsDateString, IsIn, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { emptyToUndefined } from '../../../../common/utils/empty-to-undefined.transform';

const PAYMENT_METHODS = ['cash', 'transfer', 'credit'] as const;

export class CreatePurchaseDto {
  @ApiProperty({ example: 'uuid-de-la-institución' })
  @IsUUID('loose')
  institutionId!: string;

  @ApiProperty({ example: 'uuid-de-la-sucursal' })
  @IsUUID('loose')
  branchId!: string;

  @ApiProperty({ example: 'uuid-del-proveedor' })
  @IsUUID('loose')
  supplierId!: string;

  @ApiProperty({ example: '2026-08-29' })
  @IsDateString()
  purchaseDate!: string;

  @ApiPropertyOptional({ description: 'El número que trae la factura del proveedor' })
  @Transform(emptyToUndefined)
  @IsString() @IsOptional() @MaxLength(50)
  supplierDocumentNumber?: string;

  @ApiPropertyOptional({ enum: PAYMENT_METHODS })
  @IsIn(PAYMENT_METHODS) @IsOptional()
  paymentMethod?: (typeof PAYMENT_METHODS)[number];

  @ApiPropertyOptional()
  @Transform(emptyToUndefined)
  @IsString() @IsOptional()
  notes?: string;
}
