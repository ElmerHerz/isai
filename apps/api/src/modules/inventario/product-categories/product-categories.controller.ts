import { Controller, Get, Post, Patch, Param, Body, ParseUUIDPipe } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { ProductCategoriesService } from './product-categories.service';
import { CreateProductCategoryDto } from './dto/create-product-category.dto';
import { UpdateProductCategoryDto } from './dto/update-product-category.dto';
import { RequirePermission } from '../../../common/decorators/require-permission.decorator';
import { CurrentTenant } from '../../../common/decorators/current-tenant.decorator';

@ApiTags('inventario-product-categories')
@ApiBearerAuth('access-token')
@Controller({ path: 'product-categories', version: '1' })
export class ProductCategoriesController {
  constructor(private readonly productCategoriesService: ProductCategoriesService) {}

  @Get()
  @RequirePermission('inventory.product.view')
  @ApiOperation({ summary: 'Categorías de producto del tenant activo' })
  findAll(@CurrentTenant() tenantId: string | null) {
    return this.productCategoriesService.findAll(tenantId);
  }

  @Post()
  @RequirePermission('inventory.product.create')
  @ApiOperation({ summary: 'Crear una categoría de producto' })
  create(@Body() dto: CreateProductCategoryDto, @CurrentTenant() tenantId: string | null) {
    return this.productCategoriesService.create(tenantId, dto);
  }

  @Patch(':id')
  @RequirePermission('inventory.product.update')
  @ApiOperation({ summary: 'Editar/desactivar una categoría de producto' })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateProductCategoryDto, @CurrentTenant() tenantId: string | null) {
    return this.productCategoriesService.update(id, tenantId, dto);
  }
}
