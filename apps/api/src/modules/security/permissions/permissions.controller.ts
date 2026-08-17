import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PermissionsService } from './permissions.service';
import { RequirePermission } from '../../../common/decorators/require-permission.decorator';

@ApiTags('permissions')
@ApiBearerAuth('access-token')
@Controller({ path: 'permissions', version: '1' })
export class PermissionsController {
  constructor(private readonly permissionsService: PermissionsService) {}

  // Reutiliza el permiso de lectura de roles (catálogo de solo lectura, no
  // amerita uno propio) — quien administra roles necesita este catálogo
  // para marcar qué permisos tiene cada uno.
  @Get()
  @RequirePermission('security.role.view')
  @ApiOperation({ summary: 'Catálogo de permisos del sistema' })
  findAll() {
    return this.permissionsService.findAll();
  }
}
