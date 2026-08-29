import { IsString, IsNotEmpty, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RelocateAssetDto {
  @ApiProperty({ example: 'Bodega principal' })
  @IsString() @IsNotEmpty() @MaxLength(150)
  location!: string;

  @ApiProperty({ example: 'Se traslada para el evento de jóvenes' })
  @IsString() @IsNotEmpty() @MaxLength(255)
  notes!: string;
}
