import { IsUUID, IsInt, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterDonorStatementReceiptDto {
  @ApiProperty()
  @IsUUID('loose')
  personId!: string;

  @ApiProperty({ example: 2026 })
  @IsInt()
  @Min(2000)
  @Max(2100)
  year!: number;
}
