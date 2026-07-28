import { IsArray, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AssignPermissionsDto {
  @ApiProperty({
    type: [String],
    description: 'Lista de IDs de permisos a asignar al rol (reemplaza los existentes)',
    example: ['uuid-permiso-1', 'uuid-permiso-2'],
  })
  @IsArray()
  @IsUUID('4', { each: true })
  permissionIds!: string[];
}
