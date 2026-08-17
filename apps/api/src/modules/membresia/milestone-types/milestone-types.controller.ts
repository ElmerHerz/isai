import { Controller, Get, Post, Patch, Delete, Body, Param, ParseUUIDPipe, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { MilestoneTypesService } from './milestone-types.service';
import { CreateMilestoneTypeDto } from './dto/create-milestone-type.dto';
import { UpdateMilestoneTypeDto } from './dto/update-milestone-type.dto';
import { RequirePermission } from '../../../common/decorators/require-permission.decorator';
import { CurrentTenant } from '../../../common/decorators/current-tenant.decorator';

@ApiTags('membresia-milestone-types')
@ApiBearerAuth('access-token')
@Controller({ path: 'milestone-types', version: '1' })
export class MilestoneTypesController {
  constructor(private readonly milestoneTypesService: MilestoneTypesService) {}

  @Get()
  @RequirePermission('membership.person.view')
  @ApiOperation({ summary: 'Tipos de hito espiritual del tenant activo (ej. Bautismo)' })
  findAll(@CurrentTenant() tenantId: string | null) {
    return this.milestoneTypesService.findAll(tenantId);
  }

  @Post()
  @RequirePermission('core.milestone_type.create')
  @ApiOperation({ summary: 'Crear tipo de hito para el tenant activo (solo instituciones tipo iglesia)' })
  create(@Body() dto: CreateMilestoneTypeDto, @CurrentTenant() tenantId: string | null) {
    return this.milestoneTypesService.create(tenantId, dto);
  }

  @Patch(':id')
  @RequirePermission('core.milestone_type.update')
  @ApiOperation({ summary: 'Actualizar tipo de hito' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateMilestoneTypeDto,
    @CurrentTenant() tenantId: string | null,
  ) {
    return this.milestoneTypesService.update(id, tenantId, dto);
  }

  @Delete(':id')
  @RequirePermission('core.milestone_type.delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Eliminar tipo de hito' })
  remove(@Param('id', ParseUUIDPipe) id: string, @CurrentTenant() tenantId: string | null) {
    return this.milestoneTypesService.remove(id, tenantId);
  }
}
