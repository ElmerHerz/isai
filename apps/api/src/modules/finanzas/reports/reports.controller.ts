import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ReportsService } from './reports.service';
import { RequirePermission } from '../../../common/decorators/require-permission.decorator';
import { CurrentTenant } from '../../../common/decorators/current-tenant.decorator';

@ApiTags('finanzas-reports')
@ApiBearerAuth('access-token')
@Controller({ path: 'reports', version: '1' })
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('fund-summary')
  @RequirePermission('finance.report.view')
  @ApiOperation({ summary: 'Totales contabilizados por sucursal, grupo y cuenta (solo asientos posted)' })
  fundSummary(@CurrentTenant() tenantId: string | null) {
    return this.reportsService.fundSummary(tenantId);
  }

  @Get('dashboard-kpis')
  @RequirePermission('finance.report.view')
  @ApiOperation({ summary: 'Ingresos/gastos del mes, saldo de caja y movimientos pendientes de contabilizar' })
  dashboardKpis(@CurrentTenant() tenantId: string | null) {
    return this.reportsService.dashboardKpis(tenantId);
  }

  @Get('monthly-trend')
  @RequirePermission('finance.report.view')
  @ApiOperation({ summary: 'Ofrenda/diezmo/talento recogidos por mes, últimos 6 meses' })
  monthlyTrend(@CurrentTenant() tenantId: string | null) {
    return this.reportsService.monthlyTrend(tenantId);
  }
}
