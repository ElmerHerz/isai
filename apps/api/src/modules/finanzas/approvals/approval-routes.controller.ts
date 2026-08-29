import { Controller, Get, Post, Patch, Param, Body, ParseUUIDPipe } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { ApprovalRoutesService } from './approval-routes.service';
import { CreateApprovalRouteDto } from './dto/create-approval-route.dto';
import { UpdateApprovalRouteDto } from './dto/update-approval-route.dto';
import { RequirePermission } from '../../../common/decorators/require-permission.decorator';
import { CurrentTenant } from '../../../common/decorators/current-tenant.decorator';
import { CurrentUser, RequestUser } from '../../../common/decorators/current-user.decorator';

@ApiTags('finanzas-approval-routes')
@ApiBearerAuth('access-token')
@Controller({ path: 'approval-routes', version: '1' })
export class ApprovalRoutesController {
  constructor(private readonly approvalRoutesService: ApprovalRoutesService) {}

  @Get()
  @RequirePermission('finance.approval_route.view')
  @ApiOperation({ summary: 'Rutas de aprobación de gastos configuradas en el tenant' })
  findAll(@CurrentTenant() tenantId: string | null) {
    return this.approvalRoutesService.findAll(tenantId);
  }

  @Post()
  @RequirePermission('finance.approval_route.create')
  @ApiOperation({ summary: 'Crear una ruta de aprobación (con su secuencia de personas y cuentas)' })
  create(
    @Body() dto: CreateApprovalRouteDto,
    @CurrentTenant() tenantId: string | null,
    @CurrentUser() user: RequestUser,
  ) {
    return this.approvalRoutesService.create(tenantId, dto, user);
  }

  @Patch(':id')
  @RequirePermission('finance.approval_route.update')
  @ApiOperation({ summary: 'Editar el monto o activar/desactivar una ruta' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateApprovalRouteDto,
    @CurrentTenant() tenantId: string | null,
  ) {
    return this.approvalRoutesService.update(id, tenantId, dto);
  }
}
