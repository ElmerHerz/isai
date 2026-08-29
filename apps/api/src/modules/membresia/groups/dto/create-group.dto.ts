import { IsString, IsNotEmpty, IsOptional, IsUUID, MaxLength, IsBoolean } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { emptyToUndefined } from '../../../../common/utils/empty-to-undefined.transform';

export class CreateGroupDto {
  @ApiProperty({ example: 'uuid-de-la-institución' })
  @IsUUID('loose')
  institutionId!: string;

  @ApiPropertyOptional({ description: 'Vacío = grupo de toda la institución, no de una sucursal en particular' })
  @IsUUID('loose')
  @IsOptional()
  branchId?: string;

  @ApiProperty({ example: 'uuid-del-catalog-item (catalogCode=group_type)' })
  @IsUUID('loose')
  groupTypeId!: string;

  @ApiProperty({ example: 'Célula Los Olivos' })
  @IsString() @IsNotEmpty() @MaxLength(150)
  name!: string;

  @ApiPropertyOptional()
  @Transform(emptyToUndefined)
  @IsString() @IsOptional()
  description?: string;

  @ApiPropertyOptional({ description: 'Persona líder del grupo, opcional' })
  @IsUUID('loose')
  @IsOptional()
  leaderPersonId?: string;

  @ApiPropertyOptional({ description: 'Cuenta de Activo donde vive el fondo propio del grupo (ej. "Caja: Fondo Músicos"). Requerida antes de poder registrar movimientos del fondo.' })
  @IsUUID('loose')
  @IsOptional()
  cashAccountId?: string;

  @ApiPropertyOptional()
  @IsBoolean() @IsOptional()
  isActive?: boolean;
}
