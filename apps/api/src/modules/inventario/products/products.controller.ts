import { Controller, Get, Post, Patch, Delete, Param, Body, ParseUUIDPipe } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { CreateProductUnitDto } from './dto/create-product-unit.dto';
import { InventoryService } from '../inventory/inventory.service';
import { AdjustStockDto } from '../inventory/dto/adjust-stock.dto';
import { ConsumeStockDto } from '../inventory/dto/consume-stock.dto';
import { RequirePermission } from '../../../common/decorators/require-permission.decorator';
import { CurrentTenant } from '../../../common/decorators/current-tenant.decorator';
import { CurrentUser, RequestUser } from '../../../common/decorators/current-user.decorator';

@ApiTags('inventario-products')
@ApiBearerAuth('access-token')
@Controller({ path: 'products', version: '1' })
export class ProductsController {
  constructor(
    private readonly productsService: ProductsService,
    private readonly inventoryService: InventoryService,
  ) {}

  @Get()
  @RequirePermission('inventory.product.view')
  @ApiOperation({ summary: 'Catálogo de productos del tenant activo' })
  findAll(@CurrentTenant() tenantId: string | null) {
    return this.productsService.findAll(tenantId);
  }

  @Get('by-barcode/:barcode')
  @RequirePermission('inventory.product.view')
  @ApiOperation({ summary: 'Buscar un producto por código de barras (para un lector tipo keyboard-wedge)' })
  findByBarcode(@Param('barcode') barcode: string, @CurrentTenant() tenantId: string | null) {
    return this.productsService.findByBarcode(barcode, tenantId);
  }

  @Get(':id')
  @RequirePermission('inventory.product.view')
  @ApiOperation({ summary: 'Detalle de un producto' })
  findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentTenant() tenantId: string | null) {
    return this.productsService.findOne(id, tenantId);
  }

  @Post()
  @RequirePermission('inventory.product.create')
  @ApiOperation({ summary: 'Crear un producto' })
  create(@Body() dto: CreateProductDto, @CurrentTenant() tenantId: string | null) {
    return this.productsService.create(tenantId, dto);
  }

  @Patch(':id')
  @RequirePermission('inventory.product.update')
  @ApiOperation({ summary: 'Editar un producto' })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateProductDto, @CurrentTenant() tenantId: string | null) {
    return this.productsService.update(id, tenantId, dto);
  }

  @Get(':id/stock')
  @RequirePermission('inventory.product.view')
  @ApiOperation({ summary: 'Existencia de un producto por sucursal' })
  getStock(@Param('id', ParseUUIDPipe) id: string, @CurrentTenant() tenantId: string | null) {
    return this.inventoryService.getStockByProduct(id, tenantId);
  }

  @Get(':id/movements')
  @RequirePermission('inventory.product.view')
  @ApiOperation({ summary: 'Historial de movimientos de existencia de un producto (últimos 50)' })
  getMovements(@Param('id', ParseUUIDPipe) id: string, @CurrentTenant() tenantId: string | null) {
    return this.inventoryService.getMovementsByProduct(id, tenantId);
  }

  @Post(':id/adjust-stock')
  @RequirePermission('inventory.product.update')
  @ApiOperation({ summary: 'Ajustar existencia manualmente (conteo físico, merma) — sin asiento contable' })
  adjustStock(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AdjustStockDto,
    @CurrentTenant() tenantId: string | null,
    @CurrentUser() user: RequestUser,
  ) {
    return this.inventoryService.adjustStock(id, tenantId, dto, user);
  }

  @Post(':id/units')
  @RequirePermission('inventory.product.update')
  @ApiOperation({ summary: 'Agregar una presentación de compra/venta (ej. Caja, Fardo) a un producto' })
  addUnit(@Param('id', ParseUUIDPipe) id: string, @Body() dto: CreateProductUnitDto, @CurrentTenant() tenantId: string | null) {
    return this.productsService.addUnit(id, tenantId, dto);
  }

  @Delete(':id/units/:unitId')
  @RequirePermission('inventory.product.update')
  @ApiOperation({ summary: 'Quitar una presentación de un producto' })
  removeUnit(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('unitId', ParseUUIDPipe) unitId: string,
    @CurrentTenant() tenantId: string | null,
  ) {
    return this.productsService.removeUnit(id, unitId, tenantId);
  }

  @Post(':id/consume')
  @RequirePermission('inventory.product.update')
  @ApiOperation({ summary: 'Registrar uso interno — descuenta existencia y contabiliza el gasto' })
  consume(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ConsumeStockDto,
    @CurrentTenant() tenantId: string | null,
    @CurrentUser() user: RequestUser,
  ) {
    return this.inventoryService.consume(id, tenantId, dto, user);
  }
}
