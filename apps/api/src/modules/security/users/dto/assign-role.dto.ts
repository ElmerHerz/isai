import { IsUUID, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AssignRoleDto {
  @ApiProperty({ example: 'uuid-del-rol' })
  @IsUUID('loose')
  roleId!: string;

  @ApiPropertyOptional({ description: 'Vacío = rol aplica a todo el tenant' })
  @IsUUID('loose')
  @IsOptional()
  institutionId?: string;

  @ApiPropertyOptional({ description: 'Vacío = rol aplica a toda la institución. Requiere institutionId.' })
  @IsUUID('loose')
  @IsOptional()
  branchId?: string;

  @ApiPropertyOptional({ description: 'Restringe el rol a un solo grupo (ej. Tesorero de un grupo puntual). Requiere institutionId, independiente de branchId.' })
  @IsUUID('loose')
  @IsOptional()
  groupId?: string;
}
