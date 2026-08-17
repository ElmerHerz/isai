import { Controller, Get, Post, Patch, Delete, Body, Param, ParseUUIDPipe, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { FundTypesService } from './fund-types.service';
import { CreateFundTypeDto } from './dto/create-fund-type.dto';
import { UpdateFundTypeDto } from './dto/update-fund-type.dto';
import { RequirePermission } from '../../../common/decorators/require-permission.decorator';
import { CurrentTenant } from '../../../common/decorators/current-tenant.decorator';

@ApiTags('membresia-fund-types')
@ApiBearerAuth('access-token')
@Controller({ path: 'fund-types', version: '1' })
export class FundTypesController {
  constructor(private readonly fundTypesService: FundTypesService) {}

  @Get()
  @RequirePermission('membership.event.view')
  @ApiOperation({ summary: 'Tipos de fondo del tenant activo (ej. Ofrenda, Diezmo, Talentos)' })
  findAll(@CurrentTenant() tenantId: string | null) {
    return this.fundTypesService.findAll(tenantId);
  }

  @Post()
  @RequirePermission('core.fund_type.create')
  @ApiOperation({ summary: 'Crear tipo de fondo para el tenant activo (solo instituciones tipo iglesia)' })
  create(@Body() dto: CreateFundTypeDto, @CurrentTenant() tenantId: string | null) {
    return this.fundTypesService.create(tenantId, dto);
  }

  @Patch(':id')
  @RequirePermission('core.fund_type.update')
  @ApiOperation({ summary: 'Actualizar tipo de fondo' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateFundTypeDto,
    @CurrentTenant() tenantId: string | null,
  ) {
    return this.fundTypesService.update(id, tenantId, dto);
  }

  @Delete(':id')
  @RequirePermission('core.fund_type.delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Eliminar tipo de fondo' })
  remove(@Param('id', ParseUUIDPipe) id: string, @CurrentTenant() tenantId: string | null) {
    return this.fundTypesService.remove(id, tenantId);
  }
}
