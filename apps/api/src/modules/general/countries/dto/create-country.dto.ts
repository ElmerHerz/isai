import { IsString, IsNotEmpty, Length, Matches, IsOptional, IsBoolean } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { emptyToUndefined } from '../../../../common/utils/empty-to-undefined.transform';

export class CreateCountryDto {
  @ApiProperty({ example: 'GT', description: 'Código ISO 3166-1 alpha-2, 2 letras mayúsculas' })
  @IsString() @IsNotEmpty() @Length(2, 2)
  @Matches(/^[A-Z]{2}$/, { message: 'code debe ser 2 letras mayúsculas (ISO 3166-1)' })
  code!: string;

  @ApiProperty({ example: 'Guatemala' })
  @IsString() @IsNotEmpty() @Length(1, 100)
  name!: string;

  @ApiPropertyOptional({ example: '+502' })
  @Transform(emptyToUndefined)
  @IsString() @IsOptional() @Length(1, 5)
  phonePrefix?: string;

  @ApiPropertyOptional({ example: 'GTQ', description: 'Código de moneda por defecto (debe existir en el catálogo de monedas)' })
  @Transform(emptyToUndefined)
  @IsString() @IsOptional() @Length(3, 3)
  @Matches(/^[A-Z]{3}$/, { message: 'defaultCurrencyCode debe ser 3 letras mayúsculas (ISO 4217)' })
  defaultCurrencyCode?: string;

  @ApiPropertyOptional({ example: true })
  @IsBoolean() @IsOptional()
  isActive?: boolean;
}
