import { IsUUID, IsNumber, IsPositive, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AddPurchaseLineDto {
  @ApiProperty({ example: 'uuid-del-producto' })
  @IsUUID('loose')
  productId!: string;

  @ApiProperty({ example: 10 })
  @IsNumber() @IsPositive()
  quantity!: number;

  @ApiProperty({ example: 2.5 })
  @IsNumber() @Min(0)
  unitCost!: number;
}
