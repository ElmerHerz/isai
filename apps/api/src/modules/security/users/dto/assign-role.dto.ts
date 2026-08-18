import { IsUUID, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AssignRoleDto {
  @ApiProperty({ example: 'uuid-del-rol' })
  @IsUUID()
  roleId!: string;

  @ApiPropertyOptional({ description: 'Vacío = rol aplica a todo el tenant' })
  @IsUUID()
  @IsOptional()
  institutionId?: string;

  @ApiPropertyOptional({ description: 'Vacío = rol aplica a toda la institución. Requiere institutionId.' })
  @IsUUID()
  @IsOptional()
  branchId?: string;

  @ApiPropertyOptional({ description: 'Restringe el rol a un solo grupo (ej. Tesorero de un grupo puntual). Requiere institutionId, independiente de branchId.' })
  @IsUUID()
  @IsOptional()
  groupId?: string;
}
