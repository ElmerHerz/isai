import { Controller, Get, Post, Patch, Delete, Param, Query, Body, ParseUUIDPipe, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { BudgetsService } from './budgets.service';
import { CreateBudgetDto } from './dto/create-budget.dto';
import { UpdateBudgetDto } from './dto/update-budget.dto';
import { CreateBudgetLineDto } from './dto/create-budget-line.dto';
import { RequirePermission } from '../../../common/decorators/require-permission.decorator';
import { CurrentTenant } from '../../../common/decorators/current-tenant.decorator';
import { CurrentUser, RequestUser } from '../../../common/decorators/current-user.decorator';

@ApiTags('finanzas-budgets')
@ApiBearerAuth('access-token')
@Controller({ path: 'budgets', version: '1' })
export class BudgetsController {
  constructor(private readonly budgetsService: BudgetsService) {}

  @Get()
  @RequirePermission('finance.budget.view')
  @ApiQuery({ name: 'institutionId', required: true })
  @ApiOperation({ summary: 'Presupuestos de una institución, accesibles al usuario' })
  findAll(
    @Query('institutionId', ParseUUIDPipe) institutionId: string,
    @CurrentTenant() tenantId: string | null,
    @CurrentUser() user: RequestUser,
  ) {
    return this.budgetsService.findAll(institutionId, tenantId, user);
  }

  @Get(':id')
  @RequirePermission('finance.budget.view')
  @ApiOperation({ summary: 'Detalle de un presupuesto con sus líneas' })
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentTenant() tenantId: string | null,
    @CurrentUser() user: RequestUser,
  ) {
    return this.budgetsService.findOne(id, tenantId, user);
  }

  @Post()
  @RequirePermission('finance.budget.create')
  @ApiOperation({ summary: 'Crear un presupuesto' })
  create(@Body() dto: CreateBudgetDto, @CurrentTenant() tenantId: string | null, @CurrentUser() user: RequestUser) {
    return this.budgetsService.create(tenantId, dto, user);
  }

  @Patch(':id')
  @RequirePermission('finance.budget.update')
  @ApiOperation({ summary: 'Editar nombre/periodo/estado/notas de un presupuesto' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateBudgetDto,
    @CurrentTenant() tenantId: string | null,
    @CurrentUser() user: RequestUser,
  ) {
    return this.budgetsService.update(id, tenantId, dto, user);
  }

  @Post(':id/lines')
  @RequirePermission('finance.budget.update')
  @ApiOperation({ summary: 'Agregar una línea (cuenta + monto mensual) a un presupuesto' })
  addLine(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateBudgetLineDto,
    @CurrentTenant() tenantId: string | null,
    @CurrentUser() user: RequestUser,
  ) {
    return this.budgetsService.addLine(id, tenantId, dto, user);
  }

  @Delete(':id/lines/:lineId')
  @RequirePermission('finance.budget.update')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Quitar una línea de un presupuesto' })
  removeLine(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('lineId', ParseUUIDPipe) lineId: string,
    @CurrentTenant() tenantId: string | null,
    @CurrentUser() user: RequestUser,
  ) {
    return this.budgetsService.removeLine(id, lineId, tenantId, user);
  }
}
