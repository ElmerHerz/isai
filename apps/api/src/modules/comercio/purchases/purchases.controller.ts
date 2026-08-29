import { Controller, Get, Post, Delete, Param, Query, Body, ParseUUIDPipe, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { PurchasesService } from './purchases.service';
import { CreatePurchaseDto } from './dto/create-purchase.dto';
import { AddPurchaseLineDto } from './dto/add-purchase-line.dto';
import { RequirePermission } from '../../../common/decorators/require-permission.decorator';
import { CurrentTenant } from '../../../common/decorators/current-tenant.decorator';
import { CurrentUser, RequestUser } from '../../../common/decorators/current-user.decorator';

@ApiTags('comercio-purchases')
@ApiBearerAuth('access-token')
@Controller({ path: 'purchases', version: '1' })
export class PurchasesController {
  constructor(private readonly purchasesService: PurchasesService) {}

  @Get()
  @RequirePermission('store.purchase.view')
  @ApiQuery({ name: 'institutionId', required: true })
  @ApiOperation({ summary: 'Compras de una institución, accesibles al usuario' })
  findAll(
    @Query('institutionId', ParseUUIDPipe) institutionId: string,
    @CurrentTenant() tenantId: string | null,
    @CurrentUser() user: RequestUser,
  ) {
    return this.purchasesService.findAll(institutionId, tenantId, user);
  }

  @Get(':id')
  @RequirePermission('store.purchase.view')
  @ApiOperation({ summary: 'Detalle de una compra con sus líneas' })
  findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentTenant() tenantId: string | null, @CurrentUser() user: RequestUser) {
    return this.purchasesService.findOne(id, tenantId, user);
  }

  @Post()
  @RequirePermission('store.purchase.create')
  @ApiOperation({ summary: 'Registrar una compra (encabezado, sin líneas todavía)' })
  create(@Body() dto: CreatePurchaseDto, @CurrentTenant() tenantId: string | null, @CurrentUser() user: RequestUser) {
    return this.purchasesService.create(tenantId, dto, user);
  }

  @Post(':id/lines')
  @RequirePermission('store.purchase.create')
  @ApiOperation({ summary: 'Agregar una línea (producto + cantidad + costo) a una compra' })
  addLine(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AddPurchaseLineDto,
    @CurrentTenant() tenantId: string | null,
    @CurrentUser() user: RequestUser,
  ) {
    return this.purchasesService.addLine(id, tenantId, dto, user);
  }

  @Delete(':id/lines/:lineId')
  @RequirePermission('store.purchase.create')
  @ApiOperation({ summary: 'Quitar una línea de una compra' })
  removeLine(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('lineId', ParseUUIDPipe) lineId: string,
    @CurrentTenant() tenantId: string | null,
    @CurrentUser() user: RequestUser,
  ) {
    return this.purchasesService.removeLine(id, lineId, tenantId, user);
  }

  @Post(':id/post-to-ledger')
  @RequirePermission('store.purchase.update')
  @ApiOperation({ summary: 'Contabilizar la compra — mueve existencia y genera el asiento contable' })
  postToLedger(@Param('id', ParseUUIDPipe) id: string, @CurrentTenant() tenantId: string | null, @CurrentUser() user: RequestUser) {
    return this.purchasesService.postToLedger(id, tenantId, user);
  }

  @Delete(':id')
  @RequirePermission('store.purchase.create')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Eliminar una compra (solo si todavía no se contabilizó)' })
  remove(@Param('id', ParseUUIDPipe) id: string, @CurrentTenant() tenantId: string | null, @CurrentUser() user: RequestUser) {
    return this.purchasesService.remove(id, tenantId, user);
  }
}
