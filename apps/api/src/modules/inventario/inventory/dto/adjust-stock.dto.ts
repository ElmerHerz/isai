import { IsString, IsNotEmpty, IsOptional, IsUUID, IsNumber, Min, MaxLength, NotEquals } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AdjustStockDto {
  @ApiProperty({ example: 'uuid-de-la-sucursal' })
  @IsUUID('loose')
  branchId!: string;

  @ApiProperty({ example: 10, description: 'Positivo = entra, negativo = sale' })
  @IsNumber() @NotEquals(0)
  quantityDelta!: number;

  @ApiPropertyOptional({ description: 'Solo si quieres actualizar el costo promedio (deltas positivos)' })
  @IsNumber() @Min(0) @IsOptional()
  unitCost?: number;

  @ApiProperty({ example: 'Conteo físico de fin de mes' })
  @IsString() @IsNotEmpty() @MaxLength(255)
  notes!: string;
}
