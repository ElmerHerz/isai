import { IsString, IsNotEmpty, Length, Matches, IsOptional, IsLatitude, IsLongitude } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { emptyToUndefined } from '../../../../common/utils/empty-to-undefined.transform';

export class UpsertAddressDto {
  @ApiProperty({ example: 'GT', description: 'Código de país (debe existir en el catálogo)' })
  @IsString() @IsNotEmpty() @Length(2, 2)
  @Matches(/^[A-Z]{2}$/, { message: 'countryCode debe ser 2 letras mayúsculas (ISO 3166-1)' })
  countryCode!: string;

  @ApiPropertyOptional({ example: 'Guatemala' })
  @Transform(emptyToUndefined)
  @IsString() @IsOptional() @Length(1, 100)
  stateProvince?: string;

  @ApiProperty({ example: 'Ciudad de Guatemala' })
  @IsString() @IsNotEmpty() @Length(1, 100)
  city!: string;

  @ApiProperty({ example: '5a avenida 10-25, zona 1' })
  @IsString() @IsNotEmpty() @Length(1, 200)
  line1!: string;

  @ApiPropertyOptional({ example: 'Frente al parque central' })
  @Transform(emptyToUndefined)
  @IsString() @IsOptional() @Length(1, 200)
  line2?: string;

  @ApiPropertyOptional({ example: '01001' })
  @Transform(emptyToUndefined)
  @IsString() @IsOptional() @Length(1, 20)
  postalCode?: string;

  @ApiPropertyOptional({ example: 14.6349 })
  @IsLatitude() @IsOptional()
  latitude?: number;

  @ApiPropertyOptional({ example: -90.5069 })
  @IsLongitude() @IsOptional()
  longitude?: number;
}
