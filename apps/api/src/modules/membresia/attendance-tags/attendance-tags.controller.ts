import { Controller, Get, Post, Patch, Delete, Body, Param, ParseUUIDPipe, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AttendanceTagsService } from './attendance-tags.service';
import { CreateAttendanceTagDto } from './dto/create-attendance-tag.dto';
import { UpdateAttendanceTagDto } from './dto/update-attendance-tag.dto';
import { RequirePermission } from '../../../common/decorators/require-permission.decorator';
import { CurrentTenant } from '../../../common/decorators/current-tenant.decorator';

@ApiTags('membresia-attendance-tags')
@ApiBearerAuth('access-token')
@Controller({ path: 'attendance-tags', version: '1' })
export class AttendanceTagsController {
  constructor(private readonly attendanceTagsService: AttendanceTagsService) {}

  @Get()
  @RequirePermission('membership.attendance.view')
  @ApiOperation({ summary: 'Etiquetas de asistencia del tenant activo (ej. Uniforme)' })
  findAll(@CurrentTenant() tenantId: string | null) {
    return this.attendanceTagsService.findAll(tenantId);
  }

  @Post()
  @RequirePermission('core.attendance_tag.create')
  @ApiOperation({ summary: 'Crear etiqueta de asistencia para el tenant activo' })
  create(@Body() dto: CreateAttendanceTagDto, @CurrentTenant() tenantId: string | null) {
    return this.attendanceTagsService.create(tenantId, dto);
  }

  @Patch(':id')
  @RequirePermission('core.attendance_tag.update')
  @ApiOperation({ summary: 'Actualizar etiqueta de asistencia' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAttendanceTagDto,
    @CurrentTenant() tenantId: string | null,
  ) {
    return this.attendanceTagsService.update(id, tenantId, dto);
  }

  @Delete(':id')
  @RequirePermission('core.attendance_tag.delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Eliminar etiqueta de asistencia' })
  remove(@Param('id', ParseUUIDPipe) id: string, @CurrentTenant() tenantId: string | null) {
    return this.attendanceTagsService.remove(id, tenantId);
  }
}
