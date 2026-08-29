import { IsString, IsNotEmpty, IsUUID, IsNumber, IsPositive, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ConsumeStockDto {
  @ApiProperty({ example: 'uuid-de-la-sucursal' })
  @IsUUID('loose')
  branchId!: string;

  @ApiProperty({ example: 2 })
  @IsNumber() @IsPositive()
  quantity!: number;

  @ApiProperty({ example: 'uuid-de-la-cuenta-de-gasto' })
  @IsUUID('loose')
  expenseAccountId!: string;

  @ApiProperty({ example: 'Culto Dominical 2026-09-06' })
  @IsString() @IsNotEmpty() @MaxLength(255)
  notes!: string;
}
