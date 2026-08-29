import { Controller, Get, Post, Body, Query, ParseUUIDPipe, ParseIntPipe, Res } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import type { FastifyReply } from 'fastify';
import { ReportsService } from './reports.service';
import { buildDonorStatementPdf } from './donor-statement-pdf';
import { RegisterDonorStatementReceiptDto } from './dto/register-donor-statement-receipt.dto';
import { RequirePermission } from '../../../common/decorators/require-permission.decorator';
import { CurrentTenant } from '../../../common/decorators/current-tenant.decorator';
import { CurrentUser, RequestUser } from '../../../common/decorators/current-user.decorator';

@ApiTags('finanzas-reports')
@ApiBearerAuth('access-token')
@Controller({ path: 'reports', version: '1' })
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('fund-summary')
  @RequirePermission('finance.report.view')
  @ApiOperation({ summary: 'Totales contabilizados por sucursal, grupo y cuenta (solo asientos posted)' })
  fundSummary(@CurrentTenant() tenantId: string | null, @CurrentUser() user: RequestUser) {
    return this.reportsService.fundSummary(tenantId, user);
  }

  @Get('dashboard-kpis')
  @RequirePermission('finance.report.view')
  @ApiOperation({ summary: 'Ingresos/gastos del mes, saldo de caja y movimientos pendientes de contabilizar' })
  dashboardKpis(@CurrentTenant() tenantId: string | null, @CurrentUser() user: RequestUser) {
    return this.reportsService.dashboardKpis(tenantId, user);
  }

  @Get('monthly-trend')
  @RequirePermission('finance.report.view')
  @ApiOperation({ summary: 'Ofrenda/diezmo/talento recogidos por mes, últimos 6 meses' })
  monthlyTrend(@CurrentTenant() tenantId: string | null, @CurrentUser() user: RequestUser) {
    return this.reportsService.monthlyTrend(tenantId, user);
  }

  @Get('income-statement')
  @RequirePermission('finance.report.view')
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  @ApiOperation({ summary: 'Estado de Resultados (Ingresos/Gastos) para un rango de fechas' })
  incomeStatement(
    @CurrentTenant() tenantId: string | null,
    @CurrentUser() user: RequestUser,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.reportsService.incomeStatement(tenantId, user, startDate, endDate);
  }

  @Get('balance-sheet')
  @RequirePermission('finance.report.view')
  @ApiQuery({ name: 'asOfDate', required: false })
  @ApiOperation({ summary: 'Balance General (Activo/Pasivo/Patrimonio) a una fecha' })
  balanceSheet(
    @CurrentTenant() tenantId: string | null,
    @CurrentUser() user: RequestUser,
    @Query('asOfDate') asOfDate?: string,
  ) {
    return this.reportsService.balanceSheet(tenantId, user, asOfDate);
  }

  @Get('entries-csv')
  @RequirePermission('finance.report.export')
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  @ApiOperation({ summary: 'CSV genérico del detalle de asientos (fecha, cuenta, descripción, debe, haber) para un rango de fechas' })
  async exportEntriesCsv(
    @CurrentTenant() tenantId: string | null,
    @CurrentUser() user: RequestUser,
    @Res() res: FastifyReply,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const csv = await this.reportsService.exportEntriesCsv(tenantId, user, startDate, endDate);
    const effectiveStart = startDate ?? `${new Date().getUTCFullYear()}-01-01`;
    const effectiveEnd = endDate ?? new Date().toISOString().slice(0, 10);
    res
      .header('Content-Type', 'text/csv; charset=utf-8')
      .header('Content-Disposition', `attachment; filename="asientos-${effectiveStart}-a-${effectiveEnd}.csv"`)
      .send(csv);
  }

  @Get('budget-vs-actual')
  @RequirePermission('finance.report.view')
  @ApiQuery({ name: 'budgetId', required: true })
  @ApiQuery({ name: 'month', required: true, description: 'Formato YYYY-MM' })
  @ApiOperation({ summary: 'Presupuestado vs. real de un presupuesto para un mes puntual' })
  budgetVsActual(
    @Query('budgetId', ParseUUIDPipe) budgetId: string,
    @Query('month') month: string,
    @CurrentTenant() tenantId: string | null,
    @CurrentUser() user: RequestUser,
  ) {
    return this.reportsService.budgetVsActual(budgetId, month, tenantId, user);
  }

  @Get('donor-statement')
  @RequirePermission('finance.donor_statement.view')
  @ApiQuery({ name: 'personId', required: true })
  @ApiQuery({ name: 'year', required: true })
  @ApiOperation({ summary: 'Previsualizar el comprobante de donación de una persona en un año (solo lectura, sin folio)' })
  getDonorStatement(
    @Query('personId', ParseUUIDPipe) personId: string,
    @Query('year', ParseIntPipe) year: number,
    @CurrentTenant() tenantId: string | null,
    @CurrentUser() user: RequestUser,
  ) {
    return this.reportsService.getDonorStatement(personId, year, tenantId, user);
  }

  @Post('donor-statement/receipts')
  @RequirePermission('finance.donor_statement.view')
  @ApiOperation({ summary: 'Registrar el comprobante de donación (asigna el folio una sola vez, reutilizable)' })
  registerDonorStatementReceipt(
    @Body() dto: RegisterDonorStatementReceiptDto,
    @CurrentTenant() tenantId: string | null,
    @CurrentUser() user: RequestUser,
  ) {
    return this.reportsService.registerDonorStatementReceipt(dto.personId, dto.year, tenantId, user);
  }

  @Get('donor-statement/pdf')
  @RequirePermission('finance.donor_statement.view')
  @ApiQuery({ name: 'personId', required: true })
  @ApiQuery({ name: 'year', required: true })
  @ApiOperation({ summary: 'Descargar el comprobante de donación en PDF (exige que ya esté registrado)' })
  async downloadDonorStatementPdf(
    @Query('personId', ParseUUIDPipe) personId: string,
    @Query('year', ParseIntPipe) year: number,
    @CurrentTenant() tenantId: string | null,
    @CurrentUser() user: RequestUser,
    @Res() res: FastifyReply,
  ) {
    const { statement, institutionName } = await this.reportsService.buildDonorStatementForPdf(personId, year, tenantId, user);
    const buffer = await buildDonorStatementPdf(statement, institutionName);
    res
      .header('Content-Type', 'application/pdf')
      .header('Content-Disposition', `attachment; filename="comprobante-${statement.receipt!.documentNumber}.pdf"`)
      .send(buffer);
  }
}
