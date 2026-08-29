import {
  Controller, Get, Post, Patch, Put, Delete, Param, Query, Body, ParseUUIDPipe, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { EventsService } from './events.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { RecordAttendanceDto } from './dto/record-attendance.dto';
import { CreateEventPrivilegeDto } from './dto/create-event-privilege.dto';
import { CreateEventFundCollectionDto } from './dto/create-event-fund-collection.dto';
import { CreateFundCollectionDonorDto } from './dto/create-fund-collection-donor.dto';
import { RequirePermission } from '../../../common/decorators/require-permission.decorator';
import { CurrentTenant } from '../../../common/decorators/current-tenant.decorator';
import { CurrentUser, RequestUser } from '../../../common/decorators/current-user.decorator';

@ApiTags('membresia-events')
@ApiBearerAuth('access-token')
@Controller({ path: 'events', version: '1' })
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Get()
  @RequirePermission('membership.event.view')
  @ApiQuery({ name: 'institutionId', required: true })
  @ApiQuery({ name: 'groupId', required: false })
  @ApiOperation({ summary: 'Listar eventos de una institución' })
  findAll(
    @Query('institutionId', ParseUUIDPipe) institutionId: string,
    @CurrentTenant() tenantId: string | null,
    @CurrentUser() user: RequestUser,
    @Query('groupId') groupId?: string,
  ) {
    return this.eventsService.findAll(institutionId, tenantId, user, groupId);
  }

  @Get(':id')
  @RequirePermission('membership.event.view')
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentTenant() tenantId: string | null,
    @CurrentUser() user: RequestUser,
  ) {
    return this.eventsService.findOne(id, tenantId, user);
  }

  @Post()
  @RequirePermission('membership.event.create')
  create(
    @Body() dto: CreateEventDto,
    @CurrentTenant() tenantId: string | null,
    @CurrentUser() user: RequestUser,
  ) {
    return this.eventsService.create(tenantId, dto, user);
  }

  @Patch(':id')
  @RequirePermission('membership.event.update')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateEventDto,
    @CurrentTenant() tenantId: string | null,
    @CurrentUser() user: RequestUser,
  ) {
    return this.eventsService.update(id, tenantId, dto, user);
  }

  @Delete(':id')
  @RequirePermission('membership.event.delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentTenant() tenantId: string | null,
    @CurrentUser() user: RequestUser,
  ) {
    return this.eventsService.remove(id, tenantId, user);
  }

  @Get(':id/roster')
  @RequirePermission('membership.attendance.view')
  @ApiOperation({ summary: 'Lista de personas elegibles para pasar asistencia en este evento, con su registro actual (si existe)' })
  getRoster(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentTenant() tenantId: string | null,
    @CurrentUser() user: RequestUser,
  ) {
    return this.eventsService.getRoster(id, tenantId, user);
  }

  @Put(':id/attendance')
  @RequirePermission('membership.attendance.create')
  @ApiOperation({ summary: 'Registrar/actualizar asistencia de una o varias personas para este evento' })
  recordAttendance(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RecordAttendanceDto,
    @CurrentTenant() tenantId: string | null,
    @CurrentUser() user: RequestUser,
  ) {
    return this.eventsService.recordAttendance(id, tenantId, dto, user);
  }

  @Get(':id/privileges')
  @RequirePermission('membership.event.view')
  @ApiOperation({ summary: 'Privilegios de culto asignados en este evento (solo instituciones tipo iglesia)' })
  findPrivileges(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentTenant() tenantId: string | null,
    @CurrentUser() user: RequestUser,
  ) {
    return this.eventsService.findPrivileges(id, tenantId, user);
  }

  @Post(':id/privileges')
  @RequirePermission('membership.event_privilege.create')
  @ApiOperation({ summary: 'Asignar un privilegio de culto a una persona en este evento' })
  createPrivilege(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateEventPrivilegeDto,
    @CurrentTenant() tenantId: string | null,
    @CurrentUser() user: RequestUser,
  ) {
    return this.eventsService.createPrivilege(id, tenantId, dto, user);
  }

  @Delete(':id/privileges/:privilegeId')
  @RequirePermission('membership.event_privilege.delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Quitar un privilegio de culto asignado' })
  removePrivilege(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('privilegeId', ParseUUIDPipe) privilegeId: string,
    @CurrentTenant() tenantId: string | null,
    @CurrentUser() user: RequestUser,
  ) {
    return this.eventsService.removePrivilege(id, privilegeId, tenantId, user);
  }

  @Get(':id/fund-collections')
  @RequirePermission('membership.event.view')
  @ApiOperation({ summary: 'Fondos recogidos en este evento (solo instituciones tipo iglesia)' })
  findFundCollections(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentTenant() tenantId: string | null,
    @CurrentUser() user: RequestUser,
  ) {
    return this.eventsService.findFundCollections(id, tenantId, user);
  }

  @Post(':id/fund-collections')
  @RequirePermission('membership.event_fund_collection.create')
  @ApiOperation({ summary: 'Registrar un monto recogido de un tipo de fondo en este evento' })
  createFundCollection(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateEventFundCollectionDto,
    @CurrentTenant() tenantId: string | null,
    @CurrentUser() user: RequestUser,
  ) {
    return this.eventsService.createFundCollection(id, tenantId, dto, user);
  }

  @Delete(':id/fund-collections/:collectionId')
  @RequirePermission('membership.event_fund_collection.delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Eliminar un registro de fondo recogido' })
  removeFundCollection(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('collectionId', ParseUUIDPipe) collectionId: string,
    @CurrentTenant() tenantId: string | null,
    @CurrentUser() user: RequestUser,
  ) {
    return this.eventsService.removeFundCollection(id, collectionId, tenantId, user);
  }

  @Get(':id/fund-collections/:collectionId/donors')
  @RequirePermission('membership.event.view')
  @ApiOperation({ summary: 'Donantes identificados en esta colecta (solo si el tipo de fondo lo permite)' })
  findFundCollectionDonors(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('collectionId', ParseUUIDPipe) collectionId: string,
    @CurrentTenant() tenantId: string | null,
    @CurrentUser() user: RequestUser,
  ) {
    return this.eventsService.findFundCollectionDonors(id, collectionId, tenantId, user);
  }

  @Post(':id/fund-collections/:collectionId/donors')
  @RequirePermission('membership.event_fund_collection.create')
  @ApiOperation({ summary: 'Identificar un donante en esta colecta' })
  addFundCollectionDonor(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('collectionId', ParseUUIDPipe) collectionId: string,
    @Body() dto: CreateFundCollectionDonorDto,
    @CurrentTenant() tenantId: string | null,
    @CurrentUser() user: RequestUser,
  ) {
    return this.eventsService.addFundCollectionDonor(id, collectionId, tenantId, dto, user);
  }

  @Delete(':id/fund-collections/:collectionId/donors/:donorId')
  @RequirePermission('membership.event_fund_collection.delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Quitar un donante identificado de esta colecta' })
  removeFundCollectionDonor(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('collectionId', ParseUUIDPipe) collectionId: string,
    @Param('donorId', ParseUUIDPipe) donorId: string,
    @CurrentTenant() tenantId: string | null,
    @CurrentUser() user: RequestUser,
  ) {
    return this.eventsService.removeFundCollectionDonor(id, collectionId, donorId, tenantId, user);
  }

  @Post(':id/fund-collections/:collectionId/post-to-ledger')
  @RequirePermission('finance.journal_entry.create')
  @ApiOperation({ summary: 'Contabilizar un fondo recogido: genera su asiento contable (debe caja, haber cuenta de ingreso)' })
  postFundCollectionToLedger(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('collectionId', ParseUUIDPipe) collectionId: string,
    @CurrentTenant() tenantId: string | null,
    @CurrentUser() user: RequestUser,
  ) {
    return this.eventsService.postFundCollectionToLedger(id, collectionId, tenantId, user);
  }
}
