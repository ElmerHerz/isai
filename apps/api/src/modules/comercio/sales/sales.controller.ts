import { Controller, Get, Post, Param, Query, Body, ParseUUIDPipe, Res } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import type { FastifyReply } from 'fastify';
import { SalesService } from './sales.service';
import { buildSaleInvoicePdf } from './sale-invoice-pdf';
import { CreateSaleDto } from './dto/create-sale.dto';
import { RequirePermission } from '../../../common/decorators/require-permission.decorator';
import { CurrentTenant } from '../../../common/decorators/current-tenant.decorator';
import { CurrentUser, RequestUser } from '../../../common/decorators/current-user.decorator';

@ApiTags('comercio-sales')
@ApiBearerAuth('access-token')
@Controller({ path: 'sales', version: '1' })
export class SalesController {
  constructor(private readonly salesService: SalesService) {}

  @Get()
  @RequirePermission('store.sale.view')
  @ApiQuery({ name: 'institutionId', required: true })
  @ApiOperation({ summary: 'Ventas de una institución, accesibles al usuario' })
  findAll(
    @Query('institutionId', ParseUUIDPipe) institutionId: string,
    @CurrentTenant() tenantId: string | null,
    @CurrentUser() user: RequestUser,
  ) {
    return this.salesService.findAll(institutionId, tenantId, user);
  }

  @Get(':id')
  @RequirePermission('store.sale.view')
  @ApiOperation({ summary: 'Detalle de una venta con sus líneas' })
  findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentTenant() tenantId: string | null, @CurrentUser() user: RequestUser) {
    return this.salesService.findOne(id, tenantId, user);
  }

  @Post()
  @RequirePermission('store.sale.create')
  @ApiOperation({ summary: 'Registrar una venta completa (encabezado + líneas) — se contabiliza de inmediato' })
  create(@Body() dto: CreateSaleDto, @CurrentTenant() tenantId: string | null, @CurrentUser() user: RequestUser) {
    return this.salesService.create(tenantId, dto, user);
  }

  @Get(':id/pdf')
  @RequirePermission('store.sale.view')
  @ApiOperation({ summary: 'Descargar la factura/recibo de la venta en PDF' })
  async downloadPdf(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentTenant() tenantId: string | null,
    @CurrentUser() user: RequestUser,
    @Res() res: FastifyReply,
  ) {
    const { sale, institutionName } = await this.salesService.getForPdf(id, tenantId, user);
    const buffer = await buildSaleInvoicePdf(sale, institutionName);
    res
      .header('Content-Type', 'application/pdf')
      .header('Content-Disposition', `attachment; filename="${sale.documentNumber}.pdf"`)
      .send(buffer);
  }
}
