import { IsString, IsNotEmpty, IsOptional, IsUUID, Matches, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { emptyToUndefined } from '../../../../common/utils/empty-to-undefined.transform';

export class CreateAccountDto {
  @ApiProperty({ example: '4004' })
  @IsString() @MaxLength(20)
  @Matches(/^[0-9.]+$/, { message: 'El código solo puede tener números y puntos (ej. "4004", "1000.01")' })
  code!: string;

  @ApiProperty({ example: 'Proyecto: Equipo de Sonido' })
  @IsString() @IsNotEmpty() @MaxLength(150)
  name!: string;

  @ApiProperty({ example: 'uuid-del-catalog-item (catalogCode=account_type)' })
  @IsUUID()
  accountTypeId!: string;

  @ApiPropertyOptional({ description: 'Cuenta padre (agrupación) — vacío = cuenta de primer nivel' })
  @Transform(emptyToUndefined)
  @IsUUID() @IsOptional()
  parentAccountId?: string;
}
