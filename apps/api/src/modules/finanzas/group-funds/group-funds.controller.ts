import { Controller, Get, Post, Param, Query, Body, ParseUUIDPipe } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { GroupFundsService } from './group-funds.service';
import { CreateGroupFundMovementDto } from './dto/create-group-fund-movement.dto';
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
  @ApiOperation({ summary: 'Movimientos del fondo propio del grupo' })
  listFundMovements(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentTenant() tenantId: string | null,
    @CurrentUser() user: RequestUser,
  ) {
    return this.groupFundsService.listFundMovements(id, tenantId, user);
  }

  @Post(':id/fund-movements')
  @RequirePermission('finance.group_fund.create')
  @ApiOperation({ summary: 'Registrar un ingreso o gasto del fondo propio del grupo (contabiliza de inmediato)' })
  createFundMovement(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateGroupFundMovementDto,
    @CurrentTenant() tenantId: string | null,
    @CurrentUser() user: RequestUser,
  ) {
    return this.groupFundsService.createFundMovement(id, tenantId, dto, user);
  }
}
