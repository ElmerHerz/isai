import { Controller, Get, Post, Patch, Body, Param, Query, ParseUUIDPipe } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags, ApiQuery } from '@nestjs/swagger';
import { CatalogItemsService } from './catalog-items.service';
import { CreateCatalogItemDto } from './dto/create-catalog-item.dto';
import { UpdateCatalogItemDto } from './dto/update-catalog-item.dto';
import { RequirePermission } from '../../../common/decorators/require-permission.decorator';
import { SuperadminOnly } from '../../../common/decorators/superadmin-only.decorator';

@ApiTags('catalog-items')
@ApiBearerAuth('access-token')
@Controller({ path: 'catalog-items', version: '1' })
export class CatalogItemsController {
  constructor(private readonly catalogItemsService: CatalogItemsService) {}

  @Get()
  @RequirePermission('core.institution.view')
  @ApiQuery({ name: 'catalogCode', required: false, example: 'schedule_type' })
  @ApiOperation({ summary: 'Catálogo genérico de ítems (discriminado por catalogCode)' })
  findAll(@Query('catalogCode') catalogCode?: string) {
    return this.catalogItemsService.findAll(catalogCode);
  }

  @Post()
  @SuperadminOnly()
  @ApiOperation({ summary: 'Crear ítem de catálogo (solo superadmin)' })
  create(@Body() dto: CreateCatalogItemDto) {
    return this.catalogItemsService.create(dto);
  }

  @Patch(':id')
  @SuperadminOnly()
  @ApiOperation({ summary: 'Actualizar ítem de catálogo (solo superadmin)' })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateCatalogItemDto) {
    return this.catalogItemsService.update(id, dto);
  }
}
