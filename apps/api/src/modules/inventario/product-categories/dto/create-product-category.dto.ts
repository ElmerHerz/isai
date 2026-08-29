import { IsString, IsNotEmpty, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateProductCategoryDto {
  @ApiProperty({ example: 'Ferretería' })
  @IsString() @IsNotEmpty() @MaxLength(100)
  name!: string;
}
