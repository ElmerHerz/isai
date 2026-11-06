import { IsBoolean, IsString, IsNotEmpty, IsOptional, IsUUID, Matches, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { emptyToUndefined } from '../../../../common/utils/empty-to-undefined.transform';

// Sin accountTypeId a propósito: cambiar el tipo de una cuenta ya creada
// invalidaría el normalBalance (y con él, el signo de todo su historial de
// movimientos) — práctica contable estándar es no re-tipear una cuenta, se
// crea una nueva y se migra si de verdad se equivocaron de tipo.
export class UpdateAccountDto {
  @ApiPropertyOptional({ example: '4004' })
  @IsString() @MaxLength(20) @IsOptional()
  @Matches(/^[0-9.]+$/, { message: 'El código solo puede tener números y puntos (ej. "4004", "1000.01")' })
  code?: string;

  @ApiPropertyOptional({ example: 'Proyecto: Equipo de Sonido' })
  @IsString() @IsNotEmpty() @MaxLength(150) @IsOptional()
  name?: string;

  @ApiPropertyOptional({ description: 'Cuenta padre (agrupación) — vacío = cuenta de primer nivel' })
  @Transform(emptyToUndefined)
  @IsUUID('loose') @IsOptional()
  parentAccountId?: string;

  @ApiPropertyOptional({ description: 'false = cuenta de agrupación (encabezado, sin movimientos propios)' })
  @IsBoolean() @IsOptional()
  allowsTransactions?: boolean;
}
