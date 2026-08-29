import { IsString, IsOptional, IsUUID, IsNumber, Min, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { emptyToUndefined } from '../../../../common/utils/empty-to-undefined.transform';

export class CreateBudgetLineDto {
  @ApiProperty({ description: 'Cuenta de Ingreso o Gasto presupuestada' })
  @IsUUID('loose')
  accountId!: string;

  @ApiProperty({ example: 500 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  monthlyAmount!: number;

  @ApiPropertyOptional()
  @Transform(emptyToUndefined)
  @IsString() @IsOptional() @MaxLength(255)
  notes?: string;
}
