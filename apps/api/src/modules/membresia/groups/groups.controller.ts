import {
  Controller, Get, Post, Patch, Delete, Param, Query, Body, ParseUUIDPipe, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { GroupsService } from './groups.service';
import { CreateGroupDto } from './dto/create-group.dto';
import { UpdateGroupDto } from './dto/update-group.dto';
import { AddGroupMemberDto } from './dto/add-group-member.dto';
import { RequirePermission } from '../../../common/decorators/require-permission.decorator';
import { CurrentTenant } from '../../../common/decorators/current-tenant.decorator';
import { CurrentUser, RequestUser } from '../../../common/decorators/current-user.decorator';

@ApiTags('membresia-groups')
@ApiBearerAuth('access-token')
@Controller({ path: 'groups', version: '1' })
export class GroupsController {
  constructor(private readonly groupsService: GroupsService) {}

  @Get()
  @RequirePermission('membership.group.view')
  @ApiQuery({ name: 'institutionId', required: true })
  @ApiOperation({ summary: 'Listar grupos de una institución' })
  findAll(
    @Query('institutionId', ParseUUIDPipe) institutionId: string,
    @CurrentTenant() tenantId: string | null,
    @CurrentUser() user: RequestUser,
  ) {
    return this.groupsService.findAll(institutionId, tenantId, user);
  }

  @Get(':id')
  @RequirePermission('membership.group.view')
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentTenant() tenantId: string | null,
    @CurrentUser() user: RequestUser,
  ) {
    return this.groupsService.findOne(id, tenantId, user);
  }

  @Post()
  @RequirePermission('membership.group.create')
  create(
    @Body() dto: CreateGroupDto,
    @CurrentTenant() tenantId: string | null,
    @CurrentUser() user: RequestUser,
  ) {
    return this.groupsService.create(tenantId, dto, user);
  }

  @Patch(':id')
  @RequirePermission('membership.group.update')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateGroupDto,
    @CurrentTenant() tenantId: string | null,
    @CurrentUser() user: RequestUser,
  ) {
    return this.groupsService.update(id, tenantId, dto, user);
  }

  @Get(':id/members')
  @RequirePermission('membership.group.view')
  @ApiOperation({ summary: 'Listar miembros actuales del grupo' })
  listMembers(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentTenant() tenantId: string | null,
    @CurrentUser() user: RequestUser,
  ) {
    return this.groupsService.listMembers(id, tenantId, user);
  }

  @Post(':id/members')
  @RequirePermission('membership.group.update')
  @ApiOperation({ summary: 'Agregar una persona al grupo' })
  addMember(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AddGroupMemberDto,
    @CurrentTenant() tenantId: string | null,
    @CurrentUser() user: RequestUser,
  ) {
    return this.groupsService.addMember(id, tenantId, dto, user);
  }

  @Delete(':id/members/:memberId')
  @RequirePermission('membership.group.update')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Cerrar la membresía de una persona en el grupo (no borra el historial)' })
  removeMember(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('memberId', ParseUUIDPipe) memberId: string,
    @CurrentTenant() tenantId: string | null,
    @CurrentUser() user: RequestUser,
  ) {
    return this.groupsService.removeMember(id, memberId, tenantId, user);
  }
}
