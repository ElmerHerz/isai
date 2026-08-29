import { IsUUID, IsOptional, IsString, IsNumber, IsPositive } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { emptyToUndefined } from '../../../../common/utils/empty-to-undefined.transform';

export class CreateEventFundCollectionDto {
  @ApiProperty({ example: 'uuid-del-tipo-de-fondo' })
  @IsUUID('loose')
  fundTypeId!: string;

  @ApiProperty({ example: 150.5 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  amount!: number;

  @ApiPropertyOptional()
  @Transform(emptyToUndefined)
  @IsString()
  @IsOptional()
  notes?: string;
}
