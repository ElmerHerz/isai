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
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { TenantsService } from './tenants.service';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import { RequirePermission } from '../../../common/decorators/require-permission.decorator';

/**
 * Regla: El controller SOLO recibe el DTO validado y delega al service.
 * No contiene lógica de negocio.
 */
@ApiTags('tenants')
@ApiBearerAuth('access-token')
@Controller({ path: 'tenants', version: '1' })
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  @Get()
  @RequirePermission('general.tenant.read')
  @ApiOperation({ summary: 'Listar todos los tenants' })
  findAll() {
    return this.tenantsService.findAll();
  }

  @Get(':id')
  @RequirePermission('general.tenant.read')
  @ApiOperation({ summary: 'Obtener un tenant por ID' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.tenantsService.findOne(id);
  }

  @Post()
  @RequirePermission('general.tenant.create')
  @ApiOperation({ summary: 'Crear un nuevo tenant' })
  create(@Body() createTenantDto: CreateTenantDto) {
    return this.tenantsService.create(createTenantDto);
  }

  @Patch(':id')
  @RequirePermission('general.tenant.update')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Actualizar un tenant' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateTenantDto: UpdateTenantDto,
  ) {
    return this.tenantsService.update(id, updateTenantDto);
  }
}
