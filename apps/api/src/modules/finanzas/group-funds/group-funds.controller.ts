import { Controller, Get, Post, Delete, Param, Query, Body, ParseUUIDPipe, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { GroupFundsService } from './group-funds.service';
import { CreateGroupFundMovementDto } from './dto/create-group-fund-movement.dto';
import { RejectFundExpenseDto } from './dto/reject-fund-expense.dto';
import { RequirePermission } from '../../../common/decorators/require-permission.decorator';
import { CurrentTenant } from '../../../common/decorators/current-tenant.decorator';
import { CurrentUser, RequestUser } from '../../../common/decorators/current-user.decorator';

@ApiTags('finanzas-group-funds')
@ApiBearerAuth('access-token')
@Controller({ path: 'groups', version: '1' })
export class GroupFundsController {
  constructor(private readonly groupFundsService: GroupFundsService) {}

  // Segmento estático ('fund-summary') — no colisiona con ':id' de
  // GroupsController aunque compartan el mismo prefijo 'groups', los
  // routers (Fastify/find-my-way acá) siempre priorizan el match estático
  // sobre el paramétrico.
  @Get('fund-summary')
  @RequirePermission('finance.group_fund.view')
  @ApiQuery({ name: 'institutionId', required: true })
  @ApiOperation({ summary: 'Grupos con su saldo de fondo propio, filtrados por el alcance del usuario' })
  listGroupFundsSummary(
    @Query('institutionId', ParseUUIDPipe) institutionId: string,
    @CurrentTenant() tenantId: string | null,
    @CurrentUser() user: RequestUser,
  ) {
    return this.groupFundsService.listGroupFundsSummary(institutionId, tenantId, user);
  }

  @Get(':id/fund-balance')
  @RequirePermission('finance.group_fund.view')
  @ApiOperation({ summary: 'Saldo actual del fondo propio del grupo' })
  getFundBalance(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentTenant() tenantId: string | null,
    @CurrentUser() user: RequestUser,
  ) {
    return this.groupFundsService.getFundBalance(id, tenantId, user);
  }

  @Get(':id/fund-movements')
  @RequirePermission('finance.group_fund.view')
  @ApiOperation({ summary: 'Movimientos del fondo propio del grupo (ingresos posted + gastos en cualquier estado)' })
  listFundMovements(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentTenant() tenantId: string | null,
    @CurrentUser() user: RequestUser,
  ) {
    return this.groupFundsService.listFundMovements(id, tenantId, user);
  }

  @Post(':id/fund-movements')
  @RequirePermission('finance.group_fund.create')
  @ApiOperation({
    summary:
      'Registrar un ingreso (contabiliza de inmediato) o un gasto (queda pendiente de "Contabilizar", y de aprobación si la cuenta tiene una ruta configurada) del fondo propio del grupo',
  })
  createFundMovement(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateGroupFundMovementDto,
    @CurrentTenant() tenantId: string | null,
    @CurrentUser() user: RequestUser,
  ) {
    return this.groupFundsService.createFundMovement(id, tenantId, dto, user);
  }

  @Post(':id/fund-expenses/:expenseId/post-to-ledger')
  @RequirePermission('finance.journal_entry.create')
  @ApiOperation({ summary: 'Contabilizar un gasto del fondo: genera su asiento contable (debe cuenta de gasto, haber caja)' })
  postFundExpenseToLedger(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('expenseId', ParseUUIDPipe) expenseId: string,
    @CurrentTenant() tenantId: string | null,
    @CurrentUser() user: RequestUser,
  ) {
    return this.groupFundsService.postFundExpenseToLedger(id, expenseId, tenantId, user);
  }

  @Post(':id/fund-expenses/:expenseId/approve')
  @RequirePermission('finance.expense.approve')
  @ApiOperation({ summary: 'Aprobar un gasto de fondo pendiente de aprobación' })
  approveFundExpense(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('expenseId', ParseUUIDPipe) expenseId: string,
    @CurrentTenant() tenantId: string | null,
    @CurrentUser() user: RequestUser,
  ) {
    return this.groupFundsService.approveFundExpense(id, expenseId, tenantId, user);
  }

  @Post(':id/fund-expenses/:expenseId/reject')
  @RequirePermission('finance.expense.approve')
  @ApiOperation({ summary: 'Rechazar un gasto de fondo pendiente de aprobación' })
  rejectFundExpense(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('expenseId', ParseUUIDPipe) expenseId: string,
    @Body() dto: RejectFundExpenseDto,
    @CurrentTenant() tenantId: string | null,
    @CurrentUser() user: RequestUser,
  ) {
    return this.groupFundsService.rejectFundExpense(id, expenseId, dto.reason, tenantId, user);
  }

  @Delete(':id/fund-expenses/:expenseId')
  @RequirePermission('finance.group_fund.delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Eliminar un gasto de fondo (solo si no ha sido contabilizado)' })
  removeFundExpense(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('expenseId', ParseUUIDPipe) expenseId: string,
    @CurrentTenant() tenantId: string | null,
    @CurrentUser() user: RequestUser,
  ) {
    return this.groupFundsService.removeFundExpense(id, expenseId, tenantId, user);
  }
}
