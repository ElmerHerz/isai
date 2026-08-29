import { IsString, IsNotEmpty, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ReopenPeriodClosingDto {
  @ApiProperty({ example: 'Se necesita corregir un gasto mal registrado antes del cierre.' })
  @IsString() @IsNotEmpty() @MaxLength(255)
  reason!: string;
}
