import { Controller, Get, Post, Patch, Delete, Body, Param, ParseUUIDPipe, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PrivilegeTypesService } from './privilege-types.service';
import { CreatePrivilegeTypeDto } from './dto/create-privilege-type.dto';
import { UpdatePrivilegeTypeDto } from './dto/update-privilege-type.dto';
import { RequirePermission } from '../../../common/decorators/require-permission.decorator';
import { CurrentTenant } from '../../../common/decorators/current-tenant.decorator';

@ApiTags('membresia-privilege-types')
@ApiBearerAuth('access-token')
@Controller({ path: 'privilege-types', version: '1' })
export class PrivilegeTypesController {
  constructor(private readonly privilegeTypesService: PrivilegeTypesService) {}

  @Get()
  @RequirePermission('membership.event.view')
  @ApiOperation({ summary: 'Tipos de privilegio de culto del tenant activo (ej. Alabanzas)' })
  findAll(@CurrentTenant() tenantId: string | null) {
    return this.privilegeTypesService.findAll(tenantId);
  }

  @Post()
  @RequirePermission('core.privilege_type.create')
  @ApiOperation({ summary: 'Crear tipo de privilegio para el tenant activo (solo instituciones tipo iglesia)' })
  create(@Body() dto: CreatePrivilegeTypeDto, @CurrentTenant() tenantId: string | null) {
    return this.privilegeTypesService.create(tenantId, dto);
  }

  @Patch(':id')
  @RequirePermission('core.privilege_type.update')
  @ApiOperation({ summary: 'Actualizar tipo de privilegio' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePrivilegeTypeDto,
    @CurrentTenant() tenantId: string | null,
  ) {
    return this.privilegeTypesService.update(id, tenantId, dto);
  }

  @Delete(':id')
  @RequirePermission('core.privilege_type.delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Eliminar tipo de privilegio' })
  remove(@Param('id', ParseUUIDPipe) id: string, @CurrentTenant() tenantId: string | null) {
    return this.privilegeTypesService.remove(id, tenantId);
  }
}
