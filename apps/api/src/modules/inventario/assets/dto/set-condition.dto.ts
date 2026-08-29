import { IsString, IsNotEmpty, IsIn, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

const CONDITIONS = ['good', 'fair', 'damaged', 'out_of_service'] as const;

export class SetConditionDto {
  @ApiProperty({ enum: CONDITIONS })
  @IsIn(CONDITIONS)
  condition!: (typeof CONDITIONS)[number];

  @ApiProperty({ example: 'Se dañó el parlante izquierdo' })
  @IsString() @IsNotEmpty() @MaxLength(255)
  notes!: string;
}
