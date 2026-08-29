import { Controller, Get, Post, Patch, Param, Query, Body, ParseUUIDPipe } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { AssetsService } from './assets.service';
import { CreateAssetDto } from './dto/create-asset.dto';
import { UpdateAssetDto } from './dto/update-asset.dto';
import { AssignCustodianDto } from './dto/assign-custodian.dto';
import { RelocateAssetDto } from './dto/relocate-asset.dto';
import { SetConditionDto } from './dto/set-condition.dto';
import { DisposeAssetDto } from './dto/dispose-asset.dto';
import { RequirePermission } from '../../../common/decorators/require-permission.decorator';
import { CurrentTenant } from '../../../common/decorators/current-tenant.decorator';
import { CurrentUser, RequestUser } from '../../../common/decorators/current-user.decorator';

@ApiTags('inventario-assets')
@ApiBearerAuth('access-token')
@Controller({ path: 'assets', version: '1' })
export class AssetsController {
  constructor(private readonly assetsService: AssetsService) {}

  @Get()
  @RequirePermission('inventory.asset.view')
  @ApiQuery({ name: 'institutionId', required: true })
  @ApiOperation({ summary: 'Activos de una institución, accesibles al usuario' })
  findAll(
    @Query('institutionId', ParseUUIDPipe) institutionId: string,
    @CurrentTenant() tenantId: string | null,
    @CurrentUser() user: RequestUser,
  ) {
    return this.assetsService.findAll(institutionId, tenantId, user);
  }

  @Get(':id')
  @RequirePermission('inventory.asset.view')
  @ApiOperation({ summary: 'Detalle de un activo' })
  findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentTenant() tenantId: string | null, @CurrentUser() user: RequestUser) {
    return this.assetsService.findOne(id, tenantId, user);
  }

  @Get(':id/movements')
  @RequirePermission('inventory.asset.view')
  @ApiOperation({ summary: 'Historial de custodia/ubicación/condición de un activo (últimos 50)' })
  getMovements(@Param('id', ParseUUIDPipe) id: string, @CurrentTenant() tenantId: string | null, @CurrentUser() user: RequestUser) {
    return this.assetsService.getMovements(id, tenantId, user);
  }

  @Post()
  @RequirePermission('inventory.asset.create')
  @ApiOperation({ summary: 'Crear un activo' })
  create(@Body() dto: CreateAssetDto, @CurrentTenant() tenantId: string | null, @CurrentUser() user: RequestUser) {
    return this.assetsService.create(tenantId, dto, user);
  }

  @Patch(':id')
  @RequirePermission('inventory.asset.update')
  @ApiOperation({ summary: 'Editar datos básicos de un activo' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAssetDto,
    @CurrentTenant() tenantId: string | null,
    @CurrentUser() user: RequestUser,
  ) {
    return this.assetsService.update(id, tenantId, dto, user);
  }

  @Post(':id/assign-custodian')
  @RequirePermission('inventory.asset.update')
  @ApiOperation({ summary: 'Reasignar (o quitar) el custodio de un activo' })
  assignCustodian(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AssignCustodianDto,
    @CurrentTenant() tenantId: string | null,
    @CurrentUser() user: RequestUser,
  ) {
    return this.assetsService.assignCustodian(id, tenantId, dto, user);
  }

  @Post(':id/relocate')
  @RequirePermission('inventory.asset.update')
  @ApiOperation({ summary: 'Reubicar un activo' })
  relocate(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RelocateAssetDto,
    @CurrentTenant() tenantId: string | null,
    @CurrentUser() user: RequestUser,
  ) {
    return this.assetsService.relocate(id, tenantId, dto, user);
  }

  @Post(':id/set-condition')
  @RequirePermission('inventory.asset.update')
  @ApiOperation({ summary: 'Cambiar la condición de un activo' })
  setCondition(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SetConditionDto,
    @CurrentTenant() tenantId: string | null,
    @CurrentUser() user: RequestUser,
  ) {
    return this.assetsService.setCondition(id, tenantId, dto, user);
  }

  @Post(':id/dispose')
  @RequirePermission('inventory.asset.update')
  @ApiOperation({ summary: 'Dar de baja un activo' })
  dispose(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: DisposeAssetDto,
    @CurrentTenant() tenantId: string | null,
    @CurrentUser() user: RequestUser,
  ) {
    return this.assetsService.dispose(id, tenantId, dto, user);
  }
}
