import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { TenantsService } from './tenants.service';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import { UpdateTenantSettingsDto } from './dto/update-tenant-settings.dto';
import { RequirePermission } from '../../../common/decorators/require-permission.decorator';
import { CurrentTenant } from '../../../common/decorators/current-tenant.decorator';

/**
 * Regla: El controller SOLO recibe el DTO validado y delega al service.
 * No contiene lógica de negocio.
 */
@ApiTags('tenants')
@ApiBearerAuth('access-token')
@Controller({ path: 'tenants', version: '1' })
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  // Nota: 'core.tenant.*' todavía no está sembrado en seguridad.permissions
  // (Tenants nunca tuvo pantalla propia — solo superadmin lo usa hoy, y
  // superadmin bypasea el guard). Si se delega esto a un rol algún día, hay
  // que insertar las filas correspondientes primero.
  @Get()
  @RequirePermission('core.tenant.view')
  @ApiOperation({ summary: 'Listar todos los tenants' })
  findAll() {
    return this.tenantsService.findAll();
  }

  // 'me' se declara antes de ':id' a propósito — si no, Nest lo matchearía
  // como si "me" fuera un uuid de :id y tronaría en ParseUUIDPipe.
  @Get('me')
  @RequirePermission('core.tenant_settings.view')
  @ApiOperation({ summary: 'Configuración del tenant activo (moneda/país/idioma)' })
  getSelfSettings(@CurrentTenant() tenantId: string | null) {
    if (!tenantId) {
      throw new BadRequestException('Como superadmin, indica ?tenantId=<uuid> para ver la configuración de un tenant.');
    }
    return this.tenantsService.getSelfSettings(tenantId);
  }

  @Patch('me')
  @RequirePermission('core.tenant_settings.update')
  @ApiOperation({ summary: 'Actualizar moneda/país/idioma del tenant activo' })
  updateSelfSettings(
    @Body() dto: UpdateTenantSettingsDto,
    @CurrentTenant() tenantId: string | null,
  ) {
    if (!tenantId) {
      throw new BadRequestException('Como superadmin, indica ?tenantId=<uuid> para editar la configuración de un tenant.');
    }
    return this.tenantsService.updateSelfSettings(tenantId, dto);
  }

  @Get(':id')
  @RequirePermission('core.tenant.view')
  @ApiOperation({ summary: 'Obtener un tenant por ID' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.tenantsService.findOne(id);
  }

  @Post()
  @RequirePermission('core.tenant.create')
  @ApiOperation({ summary: 'Crear un nuevo tenant' })
  create(@Body() createTenantDto: CreateTenantDto) {
    return this.tenantsService.create(createTenantDto);
  }

  @Patch(':id')
  @RequirePermission('core.tenant.update')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Actualizar un tenant' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateTenantDto: UpdateTenantDto,
  ) {
    return this.tenantsService.update(id, updateTenantDto);
  }
}
