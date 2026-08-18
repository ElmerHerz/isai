import {
  Controller, Get, Post, Patch, Delete, Param, Query, Body, ParseUUIDPipe, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { ProjectsService } from './projects.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { CreateProjectContributionDto } from './dto/create-project-contribution.dto';
import { CreateProjectExpenseDto } from './dto/create-project-expense.dto';
import { RequirePermission } from '../../../common/decorators/require-permission.decorator';
import { CurrentTenant } from '../../../common/decorators/current-tenant.decorator';
import { CurrentUser, RequestUser } from '../../../common/decorators/current-user.decorator';

@ApiTags('finanzas-projects')
@ApiBearerAuth('access-token')
@Controller({ path: 'projects', version: '1' })
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Get()
  @RequirePermission('finance.project.view')
  @ApiQuery({ name: 'institutionId', required: true })
  @ApiOperation({ summary: 'Listar proyectos de una institución, con total aportado' })
  findAll(
    @Query('institutionId', ParseUUIDPipe) institutionId: string,
    @CurrentTenant() tenantId: string | null,
    @CurrentUser() user: RequestUser,
  ) {
    return this.projectsService.findAll(institutionId, tenantId, user);
  }

  @Get(':id')
  @RequirePermission('finance.project.view')
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentTenant() tenantId: string | null,
    @CurrentUser() user: RequestUser,
  ) {
    return this.projectsService.findOne(id, tenantId, user);
  }

  @Post()
  @RequirePermission('finance.project.create')
  create(
    @Body() dto: CreateProjectDto,
    @CurrentTenant() tenantId: string | null,
    @CurrentUser() user: RequestUser,
  ) {
    return this.projectsService.create(tenantId, dto, user);
  }

  @Patch(':id')
  @RequirePermission('finance.project.update')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProjectDto,
    @CurrentTenant() tenantId: string | null,
    @CurrentUser() user: RequestUser,
  ) {
    return this.projectsService.update(id, tenantId, dto, user);
  }

  @Get(':id/contributions')
  @RequirePermission('finance.project.view')
  @ApiOperation({ summary: 'Aportes registrados en este proyecto' })
  findContributions(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentTenant() tenantId: string | null,
    @CurrentUser() user: RequestUser,
  ) {
    return this.projectsService.findContributions(id, tenantId, user);
  }

  @Post(':id/contributions')
  @RequirePermission('finance.project_contribution.create')
  @ApiOperation({ summary: 'Registrar un aporte de una persona o un grupo a este proyecto' })
  createContribution(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateProjectContributionDto,
    @CurrentTenant() tenantId: string | null,
    @CurrentUser() user: RequestUser,
  ) {
    return this.projectsService.createContribution(id, tenantId, dto, user);
  }

  @Delete(':id/contributions/:contributionId')
  @RequirePermission('finance.project_contribution.delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Eliminar un aporte (solo si no ha sido contabilizado)' })
  removeContribution(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('contributionId', ParseUUIDPipe) contributionId: string,
    @CurrentTenant() tenantId: string | null,
    @CurrentUser() user: RequestUser,
  ) {
    return this.projectsService.removeContribution(id, contributionId, tenantId, user);
  }

  @Post(':id/contributions/:contributionId/post-to-ledger')
  @RequirePermission('finance.journal_entry.create')
  @ApiOperation({ summary: 'Contabilizar un aporte: genera su asiento contable (debe caja, haber cuenta de ingreso del proyecto)' })
  postContributionToLedger(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('contributionId', ParseUUIDPipe) contributionId: string,
    @CurrentTenant() tenantId: string | null,
    @CurrentUser() user: RequestUser,
  ) {
    return this.projectsService.postContributionToLedger(id, contributionId, tenantId, user);
  }

  @Get(':id/expenses')
  @RequirePermission('finance.project.view')
  @ApiOperation({ summary: 'Gastos registrados en este proyecto' })
  findExpenses(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentTenant() tenantId: string | null,
    @CurrentUser() user: RequestUser,
  ) {
    return this.projectsService.findExpenses(id, tenantId, user);
  }

  @Post(':id/expenses')
  @RequirePermission('finance.project_expense.create')
  @ApiOperation({ summary: 'Registrar un gasto de este proyecto (ej. compra del equipo)' })
  createExpense(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateProjectExpenseDto,
    @CurrentTenant() tenantId: string | null,
    @CurrentUser() user: RequestUser,
  ) {
    return this.projectsService.createExpense(id, tenantId, dto, user);
  }

  @Delete(':id/expenses/:expenseId')
  @RequirePermission('finance.project_expense.delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Eliminar un gasto (solo si no ha sido contabilizado)' })
  removeExpense(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('expenseId', ParseUUIDPipe) expenseId: string,
    @CurrentTenant() tenantId: string | null,
    @CurrentUser() user: RequestUser,
  ) {
    return this.projectsService.removeExpense(id, expenseId, tenantId, user);
  }

  @Post(':id/expenses/:expenseId/post-to-ledger')
  @RequirePermission('finance.journal_entry.create')
  @ApiOperation({ summary: 'Contabilizar un gasto: genera su asiento contable (debe cuenta de gasto, haber caja)' })
  postExpenseToLedger(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('expenseId', ParseUUIDPipe) expenseId: string,
    @CurrentTenant() tenantId: string | null,
    @CurrentUser() user: RequestUser,
  ) {
    return this.projectsService.postExpenseToLedger(id, expenseId, tenantId, user);
  }
}
