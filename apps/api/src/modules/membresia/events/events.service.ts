import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { RecordAttendanceDto } from './dto/record-attendance.dto';
import { CreateEventPrivilegeDto } from './dto/create-event-privilege.dto';
import { CreateEventFundCollectionDto } from './dto/create-event-fund-collection.dto';
import { resolveInstitutionScope, resolveBranchScope } from '../../../common/utils/institution-scope.util';
import type { RequestUser } from '../../../common/decorators/current-user.decorator';

const CHURCH_INSTITUTION_TYPE = 'church';

const include = {
  eventType: true,
  branch: { select: { id: true, name: true } },
  // branchId acá adentro (no expuesto en EventWithRelations más que para
  // esto) es lo que permite resolver el scope de sucursal de un evento
  // ligado a un grupo — ver assertEventAccessible/findAll: un evento con
  // groupId tiene su propio branchId en null (son mutuamente excluyentes),
  // así que el scope real hay que sacarlo del grupo, no del evento.
  group: { select: { id: true, name: true, branchId: true } },
  // Conteo barato de cuántas personas ya tienen asistencia registrada para
  // este evento — evita que la pantalla de Asistencia tenga que pedir el
  // roster completo (N+1) solo para mostrar "¿ya se tomó o no?" en la lista.
  _count: { select: { attendances: true } },
};

// "HH:mm" o "HH:mm:ss" -> Date (Prisma solo usa la parte de hora en columnas
// @db.Time) — mismo patrón que branch-schedules.service.ts, ver ahí el porqué
// de Date.UTC en vez de `new Date("1970-01-01THH:mm:ss")`.
function toTimeDate(value: string): Date {
  const [hours, minutes, seconds] = value.split(':').map(Number);
  return new Date(Date.UTC(1970, 0, 1, hours, minutes, seconds || 0));
}

// Mismo criterio que groups/persons/positions: rutas planas, scope chequeado
// inline, sin @RequireScope().
@Injectable()
export class EventsService {
  constructor(private readonly prisma: PrismaService) {}

  private async assertInstitutionAccessible(institutionId: string, tenantId: string | null, user: RequestUser) {
    const institution = await this.prisma.institution.findFirst({
      where: { id: institutionId, ...(tenantId ? { tenantId } : {}) },
    });
    if (!institution) {
      throw new BadRequestException(`Institución "${institutionId}" no encontrada`);
    }

    if (!user.isSuperadmin) {
      const scope = await resolveInstitutionScope(this.prisma, user);
      if (!scope.unrestricted && !scope.institutionIds.includes(institutionId)) {
        throw new ForbiddenException('No tienes alcance sobre esa institución.');
      }
    }

    return institution;
  }

  private async assertBranchBelongsToInstitution(branchId: string, institutionId: string) {
    const branch = await this.prisma.branch.findFirst({ where: { id: branchId, institutionId } });
    if (!branch) {
      throw new BadRequestException('La sucursal no pertenece a la institución indicada.');
    }
  }

  private async assertGroupBelongsToInstitution(groupId: string, institutionId: string) {
    const group = await this.prisma.group.findFirst({ where: { id: groupId, institutionId } });
    if (!group) {
      throw new BadRequestException('El grupo no pertenece a la institución indicada.');
    }
  }

  async findAll(institutionId: string, tenantId: string | null, user: RequestUser, groupId?: string) {
    await this.assertInstitutionAccessible(institutionId, tenantId, user);

    const branchScope = await resolveBranchScope(this.prisma, { ...user, institutionId });

    return this.prisma.event.findMany({
      where: {
        institutionId,
        ...(groupId ? { groupId } : {}),
        ...(branchScope.unrestricted
          ? {}
          : {
              // Un evento de grupo tiene branchId=null (ver comentario en
              // `include` arriba) — su sucursal real es la del grupo, así
              // que el filtro tiene que cubrir ambos casos por separado.
              OR: [
                { branchId: null, groupId: null },
                { branchId: { in: branchScope.branchIds } },
                { group: { branchId: null } },
                { group: { branchId: { in: branchScope.branchIds } } },
              ],
            }),
      },
      include,
      orderBy: [{ eventDate: 'desc' }],
    });
  }

  private async findEventOrThrow(id: string, tenantId: string | null) {
    const event = await this.prisma.event.findFirst({
      where: { id, ...(tenantId ? { institution: { tenantId } } : {}) },
      include,
    });
    if (!event) throw new NotFoundException(`Evento "${id}" no encontrado`);
    return event;
  }

  private async assertEventAccessible(
    event: { institutionId: string; branchId: string | null; group: { branchId: string | null } | null },
    user: RequestUser,
  ) {
    if (user.isSuperadmin) return;

    const institutionScope = await resolveInstitutionScope(this.prisma, user);
    if (!institutionScope.unrestricted && !institutionScope.institutionIds.includes(event.institutionId)) {
      throw new NotFoundException('Evento no encontrado');
    }

    // branchId propio y group.branchId son mutuamente excluyentes (ver
    // comentario en `include`) — el que esté presente es la sucursal real.
    const effectiveBranchId = event.branchId ?? event.group?.branchId ?? null;
    if (effectiveBranchId) {
      const branchScope = await resolveBranchScope(this.prisma, { ...user, institutionId: event.institutionId });
      if (!branchScope.unrestricted && !branchScope.branchIds.includes(effectiveBranchId)) {
        throw new NotFoundException('Evento no encontrado');
      }
    }
  }

  async findOne(id: string, tenantId: string | null, user: RequestUser) {
    const event = await this.findEventOrThrow(id, tenantId);
    await this.assertEventAccessible(event, user);
    return event;
  }

  // Event no tiene columna tenant_id propia (igual que Group) — el tenant se
  // deriva vía institutionId, así que no se exige ?tenantId= a un superadmin
  // acá (ver el mismo comentario en groups.service.ts::create).
  async create(tenantId: string | null, dto: CreateEventDto, user: RequestUser) {
    await this.assertInstitutionAccessible(dto.institutionId, tenantId, user);
    if (dto.branchId) {
      await this.assertBranchBelongsToInstitution(dto.branchId, dto.institutionId);
    }
    if (dto.groupId) {
      await this.assertGroupBelongsToInstitution(dto.groupId, dto.institutionId);
    }

    return this.prisma.event.create({
      data: {
        institutionId: dto.institutionId,
        branchId: dto.branchId,
        groupId: dto.groupId,
        scheduleId: dto.scheduleId,
        eventTypeId: dto.eventTypeId,
        title: dto.title,
        eventDate: new Date(dto.eventDate),
        startTime: dto.startTime ? toTimeDate(dto.startTime) : undefined,
        endTime: dto.endTime ? toTimeDate(dto.endTime) : undefined,
        notes: dto.notes,
        createdBy: user.userId,
      },
      include,
    });
  }

  async update(id: string, tenantId: string | null, dto: UpdateEventDto, user: RequestUser) {
    const event = await this.findOne(id, tenantId, user);

    const institutionId = dto.institutionId ?? event.institutionId;
    if (dto.institutionId) {
      await this.assertInstitutionAccessible(dto.institutionId, tenantId, user);
    }
    if (dto.branchId) {
      await this.assertBranchBelongsToInstitution(dto.branchId, institutionId);
    }
    if (dto.groupId) {
      await this.assertGroupBelongsToInstitution(dto.groupId, institutionId);
    }

    return this.prisma.event.update({
      where: { id },
      data: {
        institutionId: dto.institutionId,
        branchId: dto.branchId,
        groupId: dto.groupId,
        scheduleId: dto.scheduleId,
        eventTypeId: dto.eventTypeId,
        title: dto.title,
        eventDate: dto.eventDate ? new Date(dto.eventDate) : undefined,
        startTime: dto.startTime ? toTimeDate(dto.startTime) : undefined,
        endTime: dto.endTime ? toTimeDate(dto.endTime) : undefined,
        notes: dto.notes,
      },
      include,
    });
  }

  async remove(id: string, tenantId: string | null, user: RequestUser) {
    await this.findOne(id, tenantId, user);
    await this.prisma.event.delete({ where: { id } });
  }

  // --- Asistencia -----------------------------------------------------------

  // Construye el roster elegible para el evento: si tiene groupId, solo los
  // miembros ACTUALES de ese grupo; si no, las personas activas de la
  // institución (filtradas por sucursal si el evento aplica a una sola) —
  // ver docs/membresia-diseno.md sección 4.
  async getRoster(eventId: string, tenantId: string | null, user: RequestUser) {
    const event = await this.findOne(eventId, tenantId, user);

    const persons = event.groupId
      ? (
          await this.prisma.groupMember.findMany({
            where: { groupId: event.groupId, leftAt: null },
            include: { person: { select: { id: true, firstName: true, lastName: true } } },
            orderBy: { person: { lastName: 'asc' } },
          })
        ).map((gm) => gm.person)
      : await this.prisma.person.findMany({
          where: {
            institutionId: event.institutionId,
            deletedAt: null,
            isActive: true,
            ...(event.branchId ? { branchId: event.branchId } : {}),
          },
          select: { id: true, firstName: true, lastName: true },
          orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
        });

    const attendance = await this.prisma.eventAttendance.findMany({
      where: { eventId },
      include: { status: { select: { id: true, code: true, name: true } } },
    });
    const attendanceByPerson = new Map(attendance.map((a) => [a.personId, a]));

    return persons.map((person) => ({
      person,
      attendance: attendanceByPerson.get(person.id) ?? null,
    }));
  }

  async recordAttendance(eventId: string, tenantId: string | null, dto: RecordAttendanceDto, user: RequestUser) {
    const event = await this.findOne(eventId, tenantId, user);

    const personIds = dto.records.map((r) => r.personId);
    const validPersons = await this.prisma.person.findMany({
      where: { id: { in: personIds }, institutionId: event.institutionId, deletedAt: null },
      select: { id: true },
    });
    const validIds = new Set(validPersons.map((p) => p.id));
    const invalid = personIds.filter((id) => !validIds.has(id));
    if (invalid.length > 0) {
      throw new BadRequestException('Una o más personas no pertenecen a la institución de este evento.');
    }

    // Los tags deben ser códigos reales de membresia.attendance_tags — nunca
    // texto libre, ver la advertencia de esquema-libre en
    // docs/membresia-diseno.md sección 3. Es un catálogo propio de cada
    // tenant (no global), así que se valida contra el tenant DUEÑO del
    // evento — no contra el tenantId de la request (puede ser null si quien
    // llama es superadmin operando sobre un evento de cualquier tenant).
    const allTagCodes = Array.from(new Set(dto.records.flatMap((r) => r.tags ?? [])));
    if (allTagCodes.length > 0) {
      const institution = await this.prisma.institution.findUniqueOrThrow({
        where: { id: event.institutionId },
        select: { tenantId: true },
      });
      const validTags = await this.prisma.attendanceTag.findMany({
        where: { tenantId: institution.tenantId, code: { in: allTagCodes } },
        select: { code: true },
      });
      const validTagCodes = new Set(validTags.map((t) => t.code));
      const invalidTags = allTagCodes.filter((code) => !validTagCodes.has(code));
      if (invalidTags.length > 0) {
        throw new BadRequestException(`Etiqueta(s) no reconocida(s): ${invalidTags.join(', ')}.`);
      }
    }

    await Promise.all(
      dto.records.map((record) =>
        this.prisma.eventAttendance.upsert({
          where: { uq_event_attendance_person: { eventId, personId: record.personId } },
          create: {
            eventId,
            personId: record.personId,
            statusId: record.statusId,
            notes: record.notes,
            recordedBy: user.userId,
            extraData: record.tags && record.tags.length > 0 ? { tags: record.tags } : undefined,
          },
          update: {
            statusId: record.statusId,
            notes: record.notes,
            recordedBy: user.userId,
            extraData: record.tags && record.tags.length > 0 ? { tags: record.tags } : Prisma.DbNull,
          },
        }),
      ),
    );

    return this.getRoster(eventId, tenantId, user);
  }

  private async getInstitutionTenant(institutionId: string) {
    return this.prisma.institution.findUniqueOrThrow({
      where: { id: institutionId },
      select: { tenantId: true, typeCode: true },
    });
  }

  // --- Privilegios de culto -----------------------------------------------
  // Exclusivo de instituciones tipo "church" — mismo criterio que hitos
  // espirituales en PersonsService. Sin vigencia: es puntual a este evento.

  async findPrivileges(eventId: string, tenantId: string | null, user: RequestUser) {
    await this.findOne(eventId, tenantId, user);

    return this.prisma.eventPrivilege.findMany({
      where: { eventId },
      include: {
        person: { select: { id: true, firstName: true, lastName: true } },
        privilegeType: { select: { id: true, code: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createPrivilege(eventId: string, tenantId: string | null, dto: CreateEventPrivilegeDto, user: RequestUser) {
    const event = await this.findOne(eventId, tenantId, user);
    const institution = await this.getInstitutionTenant(event.institutionId);
    if (institution.typeCode !== CHURCH_INSTITUTION_TYPE) {
      throw new BadRequestException('Los privilegios de culto solo aplican a instituciones de tipo iglesia.');
    }

    const person = await this.prisma.person.findFirst({
      where: { id: dto.personId, institutionId: event.institutionId, deletedAt: null },
    });
    if (!person) {
      throw new BadRequestException('La persona no pertenece a la institución de este evento.');
    }

    const privilegeType = await this.prisma.privilegeType.findFirst({
      where: { id: dto.privilegeTypeId, tenantId: institution.tenantId },
    });
    if (!privilegeType) {
      throw new BadRequestException('Tipo de privilegio no válido.');
    }

    return this.prisma.eventPrivilege.create({
      data: { eventId, personId: dto.personId, privilegeTypeId: dto.privilegeTypeId, notes: dto.notes },
      include: {
        person: { select: { id: true, firstName: true, lastName: true } },
        privilegeType: { select: { id: true, code: true, name: true } },
      },
    });
  }

  async removePrivilege(eventId: string, privilegeId: string, tenantId: string | null, user: RequestUser) {
    await this.findOne(eventId, tenantId, user);

    const row = await this.prisma.eventPrivilege.findFirst({ where: { id: privilegeId, eventId } });
    if (!row) throw new NotFoundException(`Privilegio "${privilegeId}" no encontrado`);

    await this.prisma.eventPrivilege.delete({ where: { id: privilegeId } });
  }

  // --- Fondos recogidos -----------------------------------------------------
  // Exclusivo de instituciones tipo "church". Registro deliberadamente
  // simple (monto por tipo por evento) — pensado como insumo futuro para un
  // módulo de tesorería, no un libro contable con cuadre ni conciliación.

  async findFundCollections(eventId: string, tenantId: string | null, user: RequestUser) {
    await this.findOne(eventId, tenantId, user);

    return this.prisma.eventFundCollection.findMany({
      where: { eventId },
      include: { fundType: { select: { id: true, code: true, name: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createFundCollection(
    eventId: string,
    tenantId: string | null,
    dto: CreateEventFundCollectionDto,
    user: RequestUser,
  ) {
    const event = await this.findOne(eventId, tenantId, user);
    const institution = await this.getInstitutionTenant(event.institutionId);
    if (institution.typeCode !== CHURCH_INSTITUTION_TYPE) {
      throw new BadRequestException('Los fondos recogidos solo aplican a instituciones de tipo iglesia.');
    }

    const fundType = await this.prisma.fundType.findFirst({
      where: { id: dto.fundTypeId, tenantId: institution.tenantId },
    });
    if (!fundType) {
      throw new BadRequestException('Tipo de fondo no válido.');
    }

    return this.prisma.eventFundCollection.create({
      data: { eventId, fundTypeId: dto.fundTypeId, amount: dto.amount, notes: dto.notes },
      include: { fundType: { select: { id: true, code: true, name: true } } },
    });
  }

  async removeFundCollection(eventId: string, collectionId: string, tenantId: string | null, user: RequestUser) {
    await this.findOne(eventId, tenantId, user);

    const row = await this.prisma.eventFundCollection.findFirst({ where: { id: collectionId, eventId } });
    if (!row) throw new NotFoundException(`Registro de fondo "${collectionId}" no encontrado`);

    await this.prisma.eventFundCollection.delete({ where: { id: collectionId } });
  }
}
