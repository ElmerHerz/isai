import { Controller, Get, Post, Patch, Param, Query, Body, ParseUUIDPipe } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { PositionsService } from './positions.service';
import { CreateGroupPositionDto } from './dto/create-group-position.dto';
import { UpdateGroupPositionDto } from './dto/update-group-position.dto';
import { RequirePermission } from '../../../common/decorators/require-permission.decorator';
import { CurrentTenant } from '../../../common/decorators/current-tenant.decorator';
import { CurrentUser, RequestUser } from '../../../common/decorators/current-user.decorator';

@ApiTags('membresia-positions')
@ApiBearerAuth('access-token')
@Controller({ path: 'group-positions', version: '1' })
export class PositionsController {
  constructor(private readonly positionsService: PositionsService) {}

  @Get()
  @RequirePermission('membership.group_position.view')
  @ApiQuery({ name: 'institutionId', required: true })
  @ApiQuery({ name: 'groupId', required: false })
  @ApiOperation({ summary: 'Listar cargos de directiva de una institución' })
  findAll(
    @Query('institutionId', ParseUUIDPipe) institutionId: string,
    @CurrentTenant() tenantId: string | null,
    @CurrentUser() user: RequestUser,
    @Query('groupId') groupId?: string,
  ) {
    return this.positionsService.findAll(institutionId, tenantId, user, groupId);
  }

  // No hay permiso 'membership.group_position.create' sembrado a propósito —
  // mismo criterio que groups addMember/removeMember: asignar y cerrar un
  // cargo son ambos parte de "administrar la directiva", cubiertas por
  // .update.
  @Post()
  @RequirePermission('membership.group_position.update')
  @ApiOperation({ summary: 'Asignar una persona a un cargo de directiva' })
  create(
    @Body() dto: CreateGroupPositionDto,
    @CurrentTenant() tenantId: string | null,
    @CurrentUser() user: RequestUser,
  ) {
    return this.positionsService.create(tenantId, dto, user);
  }

  @Patch(':id')
  @RequirePermission('membership.group_position.update')
  @ApiOperation({ summary: 'Actualizar un cargo (ej. cerrar vigencia con termEnd)' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateGroupPositionDto,
    @CurrentTenant() tenantId: string | null,
    @CurrentUser() user: RequestUser,
  ) {
    return this.positionsService.update(id, tenantId, dto, user);
  }
}
