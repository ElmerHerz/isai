import {
  Controller, Get, Post, Patch, Delete, Param, Query, Body, ParseUUIDPipe, HttpCode, HttpStatus, Req, Res, BadRequestException,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiQuery, ApiConsumes } from '@nestjs/swagger';
import type { FastifyRequest, FastifyReply } from 'fastify';
import type { MultipartFields } from '@fastify/multipart';
import { PersonsService } from './persons.service';
import { CreatePersonDto } from './dto/create-person.dto';
import { UpdatePersonDto } from './dto/update-person.dto';
import { ConfirmImportDto } from './dto/confirm-import.dto';
import { CreatePersonRelationshipDto } from './dto/create-person-relationship.dto';
import { CreatePersonMilestoneDto } from './dto/create-person-milestone.dto';
import { RequirePermission } from '../../../common/decorators/require-permission.decorator';
import { CurrentTenant } from '../../../common/decorators/current-tenant.decorator';
import { CurrentUser, RequestUser } from '../../../common/decorators/current-user.decorator';

@ApiTags('membresia-persons')
@ApiBearerAuth('access-token')
@Controller({ path: 'persons', version: '1' })
export class PersonsController {
  constructor(private readonly personsService: PersonsService) {}

  @Get()
  @RequirePermission('membership.person.view')
  @ApiQuery({ name: 'institutionId', required: true })
  @ApiOperation({ summary: 'Listar personas de una institución' })
  findAll(
    @Query('institutionId', ParseUUIDPipe) institutionId: string,
    @CurrentTenant() tenantId: string | null,
    @CurrentUser() user: RequestUser,
  ) {
    return this.personsService.findAll(institutionId, tenantId, user);
  }

  // Antes de las rutas :id — "import" no puede confundirse con un id (la
  // forma /persons/import/... tiene un segmento de más), pero se declaran
  // primero por convención defensiva.
  @Get('import/template')
  @RequirePermission('membership.person.create')
  @ApiOperation({ summary: 'Descargar la plantilla de Excel para carga masiva' })
  async downloadTemplate(@Res() res: FastifyReply) {
    const workbook = this.personsService.buildTemplateWorkbook();
    const buffer = await workbook.xlsx.writeBuffer();
    res
      .header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
      .header('Content-Disposition', 'attachment; filename="plantilla-personas.xlsx"')
      .send(Buffer.from(buffer));
  }

  @Post('import/preview')
  @RequirePermission('membership.person.create')
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Previsualizar una carga masiva desde Excel (no escribe nada)' })
  async previewImport(
    @Req() req: FastifyRequest,
    @CurrentTenant() tenantId: string | null,
    @CurrentUser() user: RequestUser,
  ) {
    const data = await req.file();
    if (!data) {
      throw new BadRequestException('No se recibió ningún archivo.');
    }

    const institutionId = this.readField(data.fields, 'institutionId');
    const branchId = this.readField(data.fields, 'branchId');
    if (!institutionId) {
      throw new BadRequestException('Falta institutionId.');
    }

    const buffer = await data.toBuffer();
    return this.personsService.previewImport(tenantId, institutionId, branchId, user, buffer);
  }

  @Post('import/confirm')
  @RequirePermission('membership.person.create')
  @ApiOperation({ summary: 'Confirmar la carga masiva (crea las filas ya revisadas en la previsualización)' })
  confirmImport(
    @Body() dto: ConfirmImportDto,
    @CurrentTenant() tenantId: string | null,
    @CurrentUser() user: RequestUser,
  ) {
    return this.personsService.confirmImport(tenantId, dto, user);
  }

  @Get(':id')
  @RequirePermission('membership.person.view')
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentTenant() tenantId: string | null,
    @CurrentUser() user: RequestUser,
  ) {
    return this.personsService.findOne(id, tenantId, user);
  }

  @Get(':id/groups')
  @RequirePermission('membership.person.view')
  @ApiOperation({ summary: 'Grupos de los que la persona es miembro actual' })
  findGroups(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentTenant() tenantId: string | null,
    @CurrentUser() user: RequestUser,
  ) {
    return this.personsService.findGroups(id, tenantId, user);
  }

  @Get(':id/positions')
  @RequirePermission('membership.person.view')
  @ApiOperation({ summary: 'Cargos de directiva de la persona (vigentes y pasados)' })
  findPositions(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentTenant() tenantId: string | null,
    @CurrentUser() user: RequestUser,
  ) {
    return this.personsService.findPositions(id, tenantId, user);
  }

  @Get(':id/relationships')
  @RequirePermission('membership.person.view')
  @ApiOperation({ summary: 'Núcleo familiar de la persona (relaciones en ambos sentidos)' })
  findRelationships(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentTenant() tenantId: string | null,
    @CurrentUser() user: RequestUser,
  ) {
    return this.personsService.findRelationships(id, tenantId, user);
  }

  @Post(':id/relationships')
  @RequirePermission('membership.person_relationship.create')
  @ApiOperation({ summary: 'Agregar un familiar a la persona' })
  createRelationship(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreatePersonRelationshipDto,
    @CurrentTenant() tenantId: string | null,
    @CurrentUser() user: RequestUser,
  ) {
    return this.personsService.createRelationship(id, tenantId, dto, user);
  }

  @Delete(':id/relationships/:relationshipId')
  @RequirePermission('membership.person_relationship.delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Quitar un familiar de la persona' })
  removeRelationship(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('relationshipId', ParseUUIDPipe) relationshipId: string,
    @CurrentTenant() tenantId: string | null,
    @CurrentUser() user: RequestUser,
  ) {
    return this.personsService.removeRelationship(id, relationshipId, tenantId, user);
  }

  @Get(':id/milestones')
  @RequirePermission('membership.person.view')
  @ApiOperation({ summary: 'Hitos espirituales de la persona (solo instituciones tipo iglesia)' })
  findMilestones(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentTenant() tenantId: string | null,
    @CurrentUser() user: RequestUser,
  ) {
    return this.personsService.findMilestones(id, tenantId, user);
  }

  @Post(':id/milestones')
  @RequirePermission('membership.person_milestone.create')
  @ApiOperation({ summary: 'Registrar un hito espiritual de la persona' })
  createMilestone(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreatePersonMilestoneDto,
    @CurrentTenant() tenantId: string | null,
    @CurrentUser() user: RequestUser,
  ) {
    return this.personsService.createMilestone(id, tenantId, dto, user);
  }

  @Delete(':id/milestones/:milestoneId')
  @RequirePermission('membership.person_milestone.delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Eliminar un hito espiritual de la persona' })
  removeMilestone(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('milestoneId', ParseUUIDPipe) milestoneId: string,
    @CurrentTenant() tenantId: string | null,
    @CurrentUser() user: RequestUser,
  ) {
    return this.personsService.removeMilestone(id, milestoneId, tenantId, user);
  }

  @Post()
  @RequirePermission('membership.person.create')
  create(
    @Body() dto: CreatePersonDto,
    @CurrentTenant() tenantId: string | null,
    @CurrentUser() user: RequestUser,
  ) {
    return this.personsService.create(tenantId, dto, user);
  }

  @Patch(':id')
  @RequirePermission('membership.person.update')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePersonDto,
    @CurrentTenant() tenantId: string | null,
    @CurrentUser() user: RequestUser,
  ) {
    return this.personsService.update(id, tenantId, dto, user);
  }

  // Los campos de texto del multipart (institutionId, branchId) llegan junto
  // al archivo en `data.fields` — cada uno tipado como file o field, esto
  // filtra solo los de tipo "field" y lee su valor.
  private readField(fields: MultipartFields, name: string): string | undefined {
    const field = fields[name];
    if (!field || Array.isArray(field) || field.type !== 'field') return undefined;
    const value = field.value;
    return typeof value === 'string' && value.length > 0 ? value : undefined;
  }
}
