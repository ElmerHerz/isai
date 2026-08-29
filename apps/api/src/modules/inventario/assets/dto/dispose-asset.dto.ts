import { IsString, IsNotEmpty, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class DisposeAssetDto {
  @ApiProperty({ example: 'Se dio de baja por daño irreparable' })
  @IsString() @IsNotEmpty() @MaxLength(255)
  notes!: string;
}
