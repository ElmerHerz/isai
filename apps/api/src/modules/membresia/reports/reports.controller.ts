import { Controller, Get, Query, ParseUUIDPipe, ParseIntPipe, DefaultValuePipe } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { MembershipReportsService } from './reports.service';
import { RequirePermission } from '../../../common/decorators/require-permission.decorator';
import { CurrentTenant } from '../../../common/decorators/current-tenant.decorator';
import { CurrentUser, RequestUser } from '../../../common/decorators/current-user.decorator';

// path 'reports' — mismo prefijo que FinanzasReportsController (fund-summary/
// dashboard-kpis/monthly-trend), sin colisión: todos los segmentos son
// estáticos y distintos entre sí (attendance-trend/attendance-by-branch/
// attendance-absences/schedules), el router los distingue sin ambigüedad.
@ApiTags('membresia-reports')
@ApiBearerAuth('access-token')
@Controller({ path: 'reports', version: '1' })
export class MembershipReportsController {
  constructor(private readonly reportsService: MembershipReportsService) {}

  @Get('schedules')
  @RequirePermission('membership.attendance.view')
  @ApiQuery({ name: 'institutionId', required: true })
  @ApiOperation({ summary: 'Horarios (BranchSchedule) activos y accesibles, para filtrar reportes' })
  listSchedules(
    @Query('institutionId', ParseUUIDPipe) institutionId: string,
    @CurrentTenant() tenantId: string | null,
    @CurrentUser() user: RequestUser,
  ) {
    return this.reportsService.listSchedules(institutionId, tenantId, user);
  }

  @Get('attendance-trend')
  @RequirePermission('membership.attendance.view')
  @ApiQuery({ name: 'institutionId', required: true })
  @ApiQuery({ name: 'branchId', required: false })
  @ApiQuery({ name: 'groupId', required: false })
  @ApiQuery({ name: 'scheduleId', required: false })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  @ApiOperation({ summary: 'Asistencia por estado (Presente/Ausente/Tarde/Justificado) evento por evento' })
  attendanceTrend(
    @Query('institutionId', ParseUUIDPipe) institutionId: string,
    @CurrentTenant() tenantId: string | null,
    @CurrentUser() user: RequestUser,
    @Query('branchId') branchId?: string,
    @Query('groupId') groupId?: string,
    @Query('scheduleId') scheduleId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.reportsService.attendanceTrend(institutionId, tenantId, user, { branchId, groupId, scheduleId, startDate, endDate });
  }

  @Get('attendance-by-branch')
  @RequirePermission('membership.attendance.view')
  @ApiQuery({ name: 'institutionId', required: true })
  @ApiQuery({ name: 'groupId', required: false })
  @ApiQuery({ name: 'scheduleId', required: false })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  @ApiOperation({ summary: 'Asistencia agregada por sucursal' })
  attendanceByBranch(
    @Query('institutionId', ParseUUIDPipe) institutionId: string,
    @CurrentTenant() tenantId: string | null,
    @CurrentUser() user: RequestUser,
    @Query('groupId') groupId?: string,
    @Query('scheduleId') scheduleId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.reportsService.attendanceByBranch(institutionId, tenantId, user, { groupId, scheduleId, startDate, endDate });
  }

  @Get('attendance-absences')
  @RequirePermission('membership.attendance.view')
  @ApiQuery({ name: 'institutionId', required: true })
  @ApiQuery({ name: 'limit', required: false, example: 10 })
  @ApiQuery({ name: 'branchId', required: false })
  @ApiQuery({ name: 'groupId', required: false })
  @ApiQuery({ name: 'scheduleId', required: false })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  @ApiOperation({ summary: 'Personas con más inasistencias en sus últimos cultos (por sucursal)' })
  attendanceAbsences(
    @Query('institutionId', ParseUUIDPipe) institutionId: string,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    @CurrentTenant() tenantId: string | null,
    @CurrentUser() user: RequestUser,
    @Query('branchId') branchId?: string,
    @Query('groupId') groupId?: string,
    @Query('scheduleId') scheduleId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.reportsService.attendanceAbsences(institutionId, tenantId, user, limit, { branchId, groupId, scheduleId, startDate, endDate });
  }
}
