import {
  Controller, Get, Post, Patch, Delete, Param, Query, Body, ParseUUIDPipe, HttpCode, HttpStatus, Res,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import type { FastifyReply } from 'fastify';
import { ProjectsService } from './projects.service';
import { buildContributionReceiptPdf } from './contribution-receipt-pdf';
import { buildProjectSummaryPdf } from './project-summary-pdf';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { CreateProjectContributionDto } from './dto/create-project-contribution.dto';
import { CreateProjectExpenseDto } from './dto/create-project-expense.dto';
import { CreateProjectPledgeDto } from './dto/create-project-pledge.dto';
import { RejectExpenseDto } from './dto/reject-expense.dto';
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

  @Get(':id/export')
  @RequirePermission('finance.report.export')
  @ApiOperation({ summary: 'Descargar el resumen estadístico del proyecto en Excel (KPIs, aportes, gastos)' })
  async exportSummary(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentTenant() tenantId: string | null,
    @CurrentUser() user: RequestUser,
    @Res() res: FastifyReply,
  ) {
    const { workbook, projectName } = await this.projectsService.buildSummaryWorkbook(id, tenantId, user);
    const buffer = await workbook.xlsx.writeBuffer();
    const safeName = projectName.replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-+|-+$/g, '');
    res
      .header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
      .header('Content-Disposition', `attachment; filename="proyecto-${safeName}.xlsx"`)
      .send(Buffer.from(buffer));
  }

  @Get(':id/export/pdf')
  @RequirePermission('finance.report.export')
  @ApiOperation({ summary: 'Descargar el resumen del proyecto en PDF (mismo detalle que el Excel, formato propio)' })
  async exportSummaryPdf(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentTenant() tenantId: string | null,
    @CurrentUser() user: RequestUser,
    @Res() res: FastifyReply,
  ) {
    const data = await this.projectsService.buildSummaryPdfData(id, tenantId, user);
    const buffer = await buildProjectSummaryPdf(data);
    const safeName = data.project.name.replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-+|-+$/g, '');
    res
      .header('Content-Type', 'application/pdf')
      .header('Content-Disposition', `attachment; filename="proyecto-${safeName}.pdf"`)
      .send(buffer);
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

  @Delete(':id')
  @RequirePermission('finance.project.delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Eliminar un proyecto (solo si no tiene aportes/gastos ya contabilizados)' })
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentTenant() tenantId: string | null,
    @CurrentUser() user: RequestUser,
  ) {
    return this.projectsService.remove(id, tenantId, user);
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

  @Post(':id/contributions/:contributionId/receipt')
  @RequirePermission('finance.project_contribution.create')
  @ApiOperation({ summary: 'Generar el comprobante de un aporte (asigna el folio una sola vez, reutilizable)' })
  registerContributionReceipt(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('contributionId', ParseUUIDPipe) contributionId: string,
    @CurrentTenant() tenantId: string | null,
    @CurrentUser() user: RequestUser,
  ) {
    return this.projectsService.registerContributionReceipt(id, contributionId, tenantId, user);
  }

  @Get(':id/contributions/:contributionId/receipt/pdf')
  @RequirePermission('finance.project.view')
  @ApiOperation({ summary: 'Descargar el comprobante de un aporte en PDF (exige que ya esté generado)' })
  async downloadContributionReceiptPdf(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('contributionId', ParseUUIDPipe) contributionId: string,
    @CurrentTenant() tenantId: string | null,
    @CurrentUser() user: RequestUser,
    @Res() res: FastifyReply,
  ) {
    const { project, contribution, institutionName } = await this.projectsService.buildContributionReceiptData(
      id,
      contributionId,
      tenantId,
      user,
    );
    const buffer = await buildContributionReceiptPdf(project, contribution, institutionName);
    res
      .header('Content-Type', 'application/pdf')
      .header('Content-Disposition', `attachment; filename="comprobante-${contribution.documentNumber}.pdf"`)
      .send(buffer);
  }

  @Get(':id/pledges')
  @RequirePermission('finance.project.view')
  @ApiOperation({ summary: 'Compromisos/promesas de aporte registrados en este proyecto' })
  findPledges(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentTenant() tenantId: string | null,
    @CurrentUser() user: RequestUser,
  ) {
    return this.projectsService.findPledges(id, tenantId, user);
  }

  @Post(':id/pledges')
  @RequirePermission('finance.project_pledge.create')
  @ApiOperation({ summary: 'Registrar un compromiso de aporte de una persona o un grupo a este proyecto' })
  createPledge(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateProjectPledgeDto,
    @CurrentTenant() tenantId: string | null,
    @CurrentUser() user: RequestUser,
  ) {
    return this.projectsService.createPledge(id, tenantId, dto, user);
  }

  @Delete(':id/pledges/:pledgeId')
  @RequirePermission('finance.project_pledge.delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Eliminar un compromiso de aporte' })
  removePledge(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('pledgeId', ParseUUIDPipe) pledgeId: string,
    @CurrentTenant() tenantId: string | null,
    @CurrentUser() user: RequestUser,
  ) {
    return this.projectsService.removePledge(id, pledgeId, tenantId, user);
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

  @Post(':id/expenses/:expenseId/approve')
  @RequirePermission('finance.expense.approve')
  @ApiOperation({ summary: 'Aprobar un gasto pendiente de aprobación' })
  approveExpense(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('expenseId', ParseUUIDPipe) expenseId: string,
    @CurrentTenant() tenantId: string | null,
    @CurrentUser() user: RequestUser,
  ) {
    return this.projectsService.approveExpense(id, expenseId, tenantId, user);
  }

  @Post(':id/expenses/:expenseId/reject')
  @RequirePermission('finance.expense.approve')
  @ApiOperation({ summary: 'Rechazar un gasto pendiente de aprobación' })
  rejectExpense(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('expenseId', ParseUUIDPipe) expenseId: string,
    @Body() dto: RejectExpenseDto,
    @CurrentTenant() tenantId: string | null,
    @CurrentUser() user: RequestUser,
  ) {
    return this.projectsService.rejectExpense(id, expenseId, dto.reason, tenantId, user);
  }
}
