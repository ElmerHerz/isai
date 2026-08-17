import { IsString, Length, Matches, IsOptional } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { emptyToUndefined } from '../../../../common/utils/empty-to-undefined.transform';

// DTO separado de UpdateTenantDto a propósito: este es el que puede tocar un
// Administrador del propio tenant (self-service), nunca name/slug/isActive
// (eso sigue siendo exclusivo de PATCH /tenants/:id, solo superadmin).
export class UpdateTenantSettingsDto {
  @ApiPropertyOptional({ example: 'GTQ', description: 'Código de moneda (debe existir en el catálogo)' })
  @Transform(emptyToUndefined)
  @IsString() @IsOptional() @Length(3, 3)
  @Matches(/^[A-Z]{3}$/, { message: 'currencyCode debe ser 3 letras mayúsculas (ISO 4217)' })
  currencyCode?: string;

  @ApiPropertyOptional({ example: 'GT', description: 'Código de país (debe existir en el catálogo)' })
  @Transform(emptyToUndefined)
  @IsString() @IsOptional() @Length(2, 2)
  @Matches(/^[A-Z]{2}$/, { message: 'countryCode debe ser 2 letras mayúsculas (ISO 3166-1)' })
  countryCode?: string;

  @ApiPropertyOptional({ example: 'es', description: 'Código de idioma (debe existir en el catálogo)' })
  @Transform(emptyToUndefined)
  @IsString() @IsOptional() @Length(2, 10)
  @Matches(/^[a-z]{2}(-[A-Z]{2})?$/, { message: 'languageCode debe ser tipo "es" o "es-GT"' })
  languageCode?: string;
}
