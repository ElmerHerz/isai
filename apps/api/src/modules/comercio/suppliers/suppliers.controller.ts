import { Controller, Get, Post, Patch, Param, Body, ParseUUIDPipe } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { SuppliersService } from './suppliers.service';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';
import { RequirePermission } from '../../../common/decorators/require-permission.decorator';
import { CurrentTenant } from '../../../common/decorators/current-tenant.decorator';

@ApiTags('comercio-suppliers')
@ApiBearerAuth('access-token')
@Controller({ path: 'suppliers', version: '1' })
export class SuppliersController {
  constructor(private readonly suppliersService: SuppliersService) {}

  @Get()
  @RequirePermission('store.supplier.view')
  @ApiOperation({ summary: 'Proveedores del tenant activo' })
  findAll(@CurrentTenant() tenantId: string | null) {
    return this.suppliersService.findAll(tenantId);
  }

  @Get(':id')
  @RequirePermission('store.supplier.view')
  @ApiOperation({ summary: 'Detalle de un proveedor' })
  findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentTenant() tenantId: string | null) {
    return this.suppliersService.findOne(id, tenantId);
  }

  @Post()
  @RequirePermission('store.supplier.create')
  @ApiOperation({ summary: 'Crear un proveedor' })
  create(@Body() dto: CreateSupplierDto, @CurrentTenant() tenantId: string | null) {
    return this.suppliersService.create(tenantId, dto);
  }

  @Patch(':id')
  @RequirePermission('store.supplier.update')
  @ApiOperation({ summary: 'Editar un proveedor' })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateSupplierDto, @CurrentTenant() tenantId: string | null) {
    return this.suppliersService.update(id, tenantId, dto);
  }
}
