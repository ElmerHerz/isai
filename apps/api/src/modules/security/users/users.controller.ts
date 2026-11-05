import {
  Controller, Get, Post, Patch, Param, Body, ParseUUIDPipe, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { AssignRoleDto } from './dto/assign-role.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { RequirePermission } from '../../../common/decorators/require-permission.decorator';
import { CurrentTenant } from '../../../common/decorators/current-tenant.decorator';
import { CurrentUser, RequestUser } from '../../../common/decorators/current-user.decorator';

@ApiTags('users')
@ApiBearerAuth('access-token')
@Controller({ path: 'users', version: '1' })
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @RequirePermission('security.user.view')
  @ApiOperation({ summary: 'Listar usuarios del tenant activo' })
  findAll(@CurrentTenant() tenantId: string | null) {
    return this.usersService.findAll(tenantId);
  }

  @Get(':id')
  @RequirePermission('security.user.view')
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentTenant() tenantId: string | null,
  ) {
    return this.usersService.findOne(id, tenantId);
  }

  @Post()
  @RequirePermission('security.user.create')
  create(
    @Body() dto: CreateUserDto,
    @CurrentTenant() tenantId: string | null,
  ) {
    return this.usersService.create(tenantId, dto);
  }

  @Patch(':id')
  @RequirePermission('security.user.update')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserDto,
    @CurrentTenant() tenantId: string | null,
  ) {
    return this.usersService.update(id, tenantId, dto);
  }

  @Post(':id/reset-password')
  @RequirePermission('security.user.update')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Restablecer la contraseña de un usuario (queda con mustChangePassword=true)' })
  resetPassword(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ResetPasswordDto,
    @CurrentTenant() tenantId: string | null,
  ) {
    return this.usersService.resetPassword(id, tenantId, dto.newPassword);
  }

  @Post(':userId/roles')
  @RequirePermission('security.user.update')
  @ApiOperation({ summary: 'Asignar un rol (con scope opcional de institución/sucursal) a un usuario' })
  assignRole(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body() dto: AssignRoleDto,
    @CurrentTenant() tenantId: string | null,
    @CurrentUser() user: RequestUser,
  ) {
    return this.usersService.assignRole(userId, tenantId, dto, user);
  }
}
