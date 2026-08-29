import { Controller, Get, BadRequestException } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { ExpenseApprovalsService } from './expense-approvals.service';
import { RequirePermission } from '../../../common/decorators/require-permission.decorator';
import { CurrentTenant } from '../../../common/decorators/current-tenant.decorator';
import { CurrentUser, RequestUser } from '../../../common/decorators/current-user.decorator';

// Pantalla "Aprobaciones" — cola personal + monitor admin sobre las mismas
// ExpenseApprovalRequest que ya gobiernan Gastos de Proyecto y de Fondo de
// Grupo (ver ApprovalRoutesController para la config de rutas, distinto
// recurso). Sin acciones acá: aprobar/rechazar sigue viviendo en los
// endpoints de cada origen (/projects/.../approve, /groups/.../approve) —
// el frontend arma esa URL con el project.id/group.id que devuelve cada fila.
@ApiTags('finanzas-expense-approvals')
@ApiBearerAuth('access-token')
@Controller({ path: 'expense-approvals', version: '1' })
export class ExpenseApprovalsController {
  constructor(private readonly expenseApprovals: ExpenseApprovalsService) {}

  @Get('mine')
  @RequirePermission('finance.expense.approve')
  @ApiOperation({ summary: 'Gastos pendientes donde el usuario actual es la persona asignada al paso accionable' })
  listMine(@CurrentTenant() tenantId: string | null, @CurrentUser() user: RequestUser) {
    if (!tenantId) throw new BadRequestException('Como superadmin, indica ?tenantId=<uuid>.');
    return this.expenseApprovals.listMine(tenantId, user.userId);
  }

  @Get()
  @RequirePermission('finance.approval_route.view')
  @ApiOperation({ summary: 'Todos los gastos pendientes de aprobación en el tenant (supervisión)' })
  listAll(@CurrentTenant() tenantId: string | null) {
    if (!tenantId) throw new BadRequestException('Como superadmin, indica ?tenantId=<uuid>.');
    return this.expenseApprovals.listAll(tenantId);
  }
}
