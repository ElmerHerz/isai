import {
  Controller, Get, Post, Patch, Delete, Param, Body, ParseUUIDPipe, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { RolesService } from './roles.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { AssignPermissionsDto } from './dto/assign-permissions.dto';
import { RequirePermission } from '../../../common/decorators/require-permission.decorator';
import { CurrentTenant } from '../../../common/decorators/current-tenant.decorator';
import { CurrentUser, RequestUser } from '../../../common/decorators/current-user.decorator';

@ApiTags('roles')
@ApiBearerAuth('access-token')
@Controller({ path: 'roles', version: '1' })
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Get()
  @RequirePermission('security.role.view')
  @ApiOperation({ summary: 'Listar roles del tenant' })
  findAll(@CurrentTenant() tenantId: string | null) {
    return this.rolesService.findAll(tenantId);
  }

  @Get(':id')
  @RequirePermission('security.role.view')
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentTenant() tenantId: string | null,
  ) {
    return this.rolesService.findOne(id, tenantId);
  }

  @Post()
  @RequirePermission('security.role.create')
  create(@Body() dto: CreateRoleDto, @CurrentTenant() tenantId: string | null) {
    return this.rolesService.create(tenantId, dto);
  }

  @Patch(':id')
  @RequirePermission('security.role.update')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateRoleDto,
    @CurrentTenant() tenantId: string | null,
    @CurrentUser() user: RequestUser,
  ) {
    return this.rolesService.update(id, tenantId, dto, user);
  }

  @Post(':id/permissions')
  @RequirePermission('security.role.update')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Asignar permisos a un rol (reemplaza los existentes)' })
  assignPermissions(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AssignPermissionsDto,
    @CurrentTenant() tenantId: string | null,
    @CurrentUser() user: RequestUser,
  ) {
    return this.rolesService.assignPermissions(id, tenantId, dto.permissionIds, user);
  }

  @Delete(':id')
  @RequirePermission('security.role.delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentTenant() tenantId: string | null,
  ) {
    return this.rolesService.remove(id, tenantId);
  }
}
