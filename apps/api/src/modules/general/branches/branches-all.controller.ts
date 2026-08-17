import { Controller, Get, Param, ParseUUIDPipe } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { BranchesService } from './branches.service';
import { RequirePermission } from '../../../common/decorators/require-permission.decorator';
import { RequireScope } from '../../../common/decorators/require-scope.decorator';
import { CurrentTenant } from '../../../common/decorators/current-tenant.decorator';
import { CurrentUser, RequestUser } from '../../../common/decorators/current-user.decorator';

// Controller separado del anidado (institutions/:institutionId/branches) porque
// Nest no permite mezclar dos prefijos de ruta distintos en una sola clase.
@ApiTags('branches')
@ApiBearerAuth('access-token')
@Controller({ path: 'branches', version: '1' })
export class AllBranchesController {
  constructor(private readonly branchesService: BranchesService) {}

  @Get()
  @RequirePermission('core.branch.view')
  @ApiOperation({ summary: 'Listar todas las sucursales del tenant activo, con su institución' })
  findAllForTenant(
    @CurrentTenant() tenantId: string | null,
    @CurrentUser() user: RequestUser,
  ) {
    return this.branchesService.findAllForTenant(tenantId, user);
  }

  @Get(':branchId')
  @RequirePermission('core.branch.view')
  @RequireScope({ level: 'branch' })
  @ApiOperation({ summary: 'Obtener una sucursal por id, con su institución' })
  findOneForTenant(@Param('branchId', ParseUUIDPipe) branchId: string) {
    return this.branchesService.findOneForTenant(branchId);
  }
}
