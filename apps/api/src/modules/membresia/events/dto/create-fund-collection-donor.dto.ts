import { IsUUID, IsOptional, IsString, IsNumber, IsPositive, IsIn, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { emptyToUndefined } from '../../../../common/utils/empty-to-undefined.transform';

export class CreateFundCollectionDonorDto {
  @ApiProperty({ example: 'uuid-de-la-persona' })
  @IsUUID('loose')
  personId!: string;

  @ApiProperty({ example: 50 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  amount!: number;

  @ApiPropertyOptional({ enum: ['cash', 'transfer', 'check'] })
  @Transform(emptyToUndefined)
  @IsIn(['cash', 'transfer', 'check'])
  @IsOptional()
  paymentMethod?: 'cash' | 'transfer' | 'check';

  @ApiPropertyOptional()
  @Transform(emptyToUndefined)
  @IsString()
  @MaxLength(255)
  @IsOptional()
  notes?: string;
}
