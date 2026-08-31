import { Controller, Get, Query, ParseUUIDPipe } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { ComercioReportsService } from './reports.service';
import { RequirePermission } from '../../../common/decorators/require-permission.decorator';
import { CurrentTenant } from '../../../common/decorators/current-tenant.decorator';
import { CurrentUser, RequestUser } from '../../../common/decorators/current-user.decorator';

// Path distinto de "reports" (Finanzas ya usa ese) — mismo criterio de
// nombres planos ya usado en el resto de Comercio (suppliers, purchases...).
@ApiTags('comercio-reports')
@ApiBearerAuth('access-token')
@Controller({ path: 'store-reports', version: '1' })
export class ComercioReportsController {
  constructor(private readonly reportsService: ComercioReportsService) {}

  @Get('product-margin')
  @RequirePermission('store.report.view')
  @ApiQuery({ name: 'institutionId', required: true })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  @ApiOperation({ summary: 'Cantidad vendida, ingreso, costo y margen por producto en un rango de fechas' })
  productMargin(
    @Query('institutionId', ParseUUIDPipe) institutionId: string,
    @CurrentTenant() tenantId: string | null,
    @CurrentUser() user: RequestUser,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.reportsService.productMargin(institutionId, startDate, endDate, tenantId, user);
  }

  @Get('inventory-valuation')
  @RequirePermission('store.report.view')
  @ApiQuery({ name: 'institutionId', required: true })
  @ApiOperation({ summary: 'Existencia actual y su valor (cantidad × costo promedio) por producto' })
  inventoryValuation(
    @Query('institutionId', ParseUUIDPipe) institutionId: string,
    @CurrentTenant() tenantId: string | null,
    @CurrentUser() user: RequestUser,
  ) {
    return this.reportsService.inventoryValuation(institutionId, tenantId, user);
  }
}
