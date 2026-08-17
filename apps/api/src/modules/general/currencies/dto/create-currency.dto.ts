import { IsString, IsNotEmpty, Length, Matches, IsInt, IsOptional, IsBoolean, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCurrencyDto {
  @ApiProperty({ example: 'EUR', description: 'Código ISO 4217, 3 letras mayúsculas' })
  @IsString() @IsNotEmpty() @Length(3, 3)
  @Matches(/^[A-Z]{3}$/, { message: 'code debe ser 3 letras mayúsculas (ISO 4217)' })
  code!: string;

  @ApiProperty({ example: 'Euro' })
  @IsString() @IsNotEmpty() @Length(1, 100)
  name!: string;

  @ApiProperty({ example: '€' })
  @IsString() @IsNotEmpty() @Length(1, 5)
  symbol!: string;

  @ApiPropertyOptional({ example: 2 })
  @IsInt() @Min(0) @Max(4) @IsOptional()
  decimalPlaces?: number;

  @ApiPropertyOptional({ example: true })
  @IsBoolean() @IsOptional()
  isActive?: boolean;
}
