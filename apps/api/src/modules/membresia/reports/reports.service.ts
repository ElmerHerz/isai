import { Injectable, BadRequestException, ForbiddenException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { resolveInstitutionScope, resolveBranchScope } from '../../../common/utils/institution-scope.util';
import type { RequestUser } from '../../../common/decorators/current-user.decorator';

export interface AttendanceTrendPoint {
  eventId: string;
  eventDate: string;
  title: string;
  present: number;
  absent: number;
  late: number;
  excused: number;
  total: number;
}

export interface AttendanceByBranchRow {
  branchId: string | null;
  branchName: string;
  present: number;
  absent: number;
  late: number;
  excused: number;
  total: number;
}

export interface AttendanceAbsenceRow {
  personId: string;
  firstName: string;
  lastName: string;
  absences: number;
  considered: number;
}

export interface ReportScheduleOption {
  id: string;
  label: string;
  branchId: string;
  branchName: string;
}

export interface AttendanceReportFilters {
  branchId?: string;
  groupId?: string;
  scheduleId?: string;
  startDate?: string;
  endDate?: string;
}

// Reportes de asistencia — ver conversación de sesión: los 4 que ya tienen
// datos reales suficientes para verse bien, más filtros por sucursal/grupo/
// horario/rango de fechas. El filtro por grupo no tendrá datos hasta que
// exista un Event con groupId (ninguno hoy), pero la capacidad se deja
// lista igual, no depende de que exista el dato.
@Injectable()
export class MembershipReportsService {
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
  }

  // Nunca confiar en que "sin branchId en el filtro" signifique "sin
  // restricción" — un rol de alcance angosto (ej. Pastor de UNA sucursal)
  // debe quedar constreñido a la suya SIEMPRE, la pida explícitamente o no
  // (si no se hace este chequeo acá, alguien podría llamar el endpoint sin
  // el filtro y ver la asistencia de otras sucursales). Devuelve:
  //   null            = sin restricción, ve todas las sucursales
  //   string[] (>=0)  = solo estas sucursales (puede ser [] si no tiene ninguna asignada)
  private async resolveEffectiveBranchIds(
    institutionId: string,
    user: RequestUser,
    requestedBranchId: string | undefined,
  ): Promise<string[] | null> {
    if (user.isSuperadmin) return requestedBranchId ? [requestedBranchId] : null;

    const scope = await resolveBranchScope(this.prisma, { ...user, institutionId });
    if (scope.unrestricted) return requestedBranchId ? [requestedBranchId] : null;

    if (requestedBranchId) {
      if (!scope.branchIds.includes(requestedBranchId)) {
        throw new ForbiddenException('No tienes alcance sobre esa sucursal.');
      }
      return [requestedBranchId];
    }
    return scope.branchIds;
  }

  // Fragmento AND opcional para cada filtro — todos actúan sobre columnas
  // de membresia.events (alias "ev" en cada consulta de abajo).
  private eventFilterSql(filters: {
    branchIds: string[] | null;
    groupId?: string;
    scheduleId?: string;
    startDate?: string;
    endDate?: string;
  }): Prisma.Sql {
    const clauses: Prisma.Sql[] = [];
    if (filters.branchIds !== null) clauses.push(Prisma.sql`AND ev.branch_id = ANY(${filters.branchIds}::uuid[])`);
    if (filters.groupId) clauses.push(Prisma.sql`AND ev.group_id = ${filters.groupId}::uuid`);
    if (filters.scheduleId) clauses.push(Prisma.sql`AND ev.schedule_id = ${filters.scheduleId}::uuid`);
    if (filters.startDate) clauses.push(Prisma.sql`AND ev.event_date >= ${filters.startDate}::date`);
    if (filters.endDate) clauses.push(Prisma.sql`AND ev.event_date <= ${filters.endDate}::date`);
    return clauses.length ? Prisma.join(clauses, ' ') : Prisma.empty;
  }

  // Solo las sucursales/grupos accesibles al usuario — mismo criterio que
  // el resto de la app (ej. GroupsService.findAll), para que el filtro de
  // Horario tampoco ofrezca opciones de sucursales fuera de su alcance.
  async listSchedules(institutionId: string, tenantId: string | null, user: RequestUser): Promise<ReportScheduleOption[]> {
    await this.assertInstitutionAccessible(institutionId, tenantId, user);
    const branchIds = await this.resolveEffectiveBranchIds(institutionId, user, undefined);

    const schedules = await this.prisma.branchSchedule.findMany({
      where: {
        isActive: true,
        branch: { institutionId, ...(branchIds !== null ? { id: { in: branchIds } } : {}) },
      },
      include: { branch: { select: { id: true, name: true } } },
      orderBy: [{ branch: { name: 'asc' } }, { label: 'asc' }],
    });

    return schedules.map((s) => ({
      id: s.id,
      label: s.label ?? 'Sin nombre',
      branchId: s.branchId,
      branchName: s.branch.name,
    }));
  }

  async attendanceTrend(
    institutionId: string,
    tenantId: string | null,
    user: RequestUser,
    filters: AttendanceReportFilters,
  ): Promise<AttendanceTrendPoint[]> {
    await this.assertInstitutionAccessible(institutionId, tenantId, user);
    const branchIds = await this.resolveEffectiveBranchIds(institutionId, user, filters.branchId);
    const filterSql = this.eventFilterSql({ ...filters, branchIds });

    const rows = await this.prisma.$queryRaw<
      { event_id: string; event_date: Date; title: string; status_code: string; count: bigint }[]
    >`
      SELECT ev.id AS event_id, ev.event_date, ev.title, ct.code AS status_code, COUNT(*) AS count
      FROM membresia.event_attendance ea
      JOIN membresia.events ev ON ev.id = ea.event_id
      JOIN general.catalog_items ct ON ct.id = ea.status_id
      WHERE ev.institution_id = ${institutionId}::uuid ${filterSql}
      GROUP BY ev.id, ev.event_date, ev.title, ct.code
      ORDER BY ev.event_date
    `;

    const byEvent = new Map<string, AttendanceTrendPoint>();
    for (const row of rows) {
      if (!byEvent.has(row.event_id)) {
        byEvent.set(row.event_id, {
          eventId: row.event_id,
          eventDate: row.event_date.toISOString().slice(0, 10),
          title: row.title,
          present: 0,
          absent: 0,
          late: 0,
          excused: 0,
          total: 0,
        });
      }
      const point = byEvent.get(row.event_id)!;
      const count = Number(row.count);
      if (row.status_code === 'PRESENT') point.present = count;
      else if (row.status_code === 'ABSENT') point.absent = count;
      else if (row.status_code === 'LATE') point.late = count;
      else if (row.status_code === 'EXCUSED') point.excused = count;
      point.total += count;
    }

    return [...byEvent.values()];
  }

  async attendanceByBranch(
    institutionId: string,
    tenantId: string | null,
    user: RequestUser,
    filters: Omit<AttendanceReportFilters, 'branchId'>,
  ): Promise<AttendanceByBranchRow[]> {
    await this.assertInstitutionAccessible(institutionId, tenantId, user);
    // Sin filtro explícito de sucursal (es la propia dimensión que se
    // compara) — pero igual se constriñe al alcance real del usuario.
    const branchIds = await this.resolveEffectiveBranchIds(institutionId, user, undefined);
    const filterSql = this.eventFilterSql({ ...filters, branchIds });

    const rows = await this.prisma.$queryRaw<
      { branch_id: string | null; branch_name: string | null; status_code: string; count: bigint }[]
    >`
      SELECT b.id AS branch_id, b.name AS branch_name, ct.code AS status_code, COUNT(*) AS count
      FROM membresia.event_attendance ea
      JOIN membresia.events ev ON ev.id = ea.event_id
      LEFT JOIN general.branches b ON b.id = ev.branch_id
      JOIN general.catalog_items ct ON ct.id = ea.status_id
      WHERE ev.institution_id = ${institutionId}::uuid ${filterSql}
      GROUP BY b.id, b.name, ct.code
    `;

    const byBranch = new Map<string, AttendanceByBranchRow>();
    for (const row of rows) {
      const key = row.branch_id ?? 'null';
      if (!byBranch.has(key)) {
        byBranch.set(key, {
          branchId: row.branch_id,
          branchName: row.branch_name ?? 'Toda la institución',
          present: 0,
          absent: 0,
          late: 0,
          excused: 0,
          total: 0,
        });
      }
      const bucket = byBranch.get(key)!;
      const count = Number(row.count);
      if (row.status_code === 'PRESENT') bucket.present = count;
      else if (row.status_code === 'ABSENT') bucket.absent = count;
      else if (row.status_code === 'LATE') bucket.late = count;
      else if (row.status_code === 'EXCUSED') bucket.excused = count;
      bucket.total += count;
    }

    return [...byBranch.values()].sort((a, b) => b.total - a.total);
  }

  // Últimos N eventos POR SUCURSAL (no institución completa) — cada
  // sucursal tiene su propio calendario de cultos, mezclar "los últimos N
  // eventos de la institución" sesgaría hacia la sucursal con más
  // actividad reciente. window=8 es un valor razonable por defecto (~2
  // meses si el culto es semanal), no configurable todavía.
  async attendanceAbsences(
    institutionId: string,
    tenantId: string | null,
    user: RequestUser,
    limit: number,
    filters: AttendanceReportFilters,
  ): Promise<AttendanceAbsenceRow[]> {
    await this.assertInstitutionAccessible(institutionId, tenantId, user);
    const branchIds = await this.resolveEffectiveBranchIds(institutionId, user, filters.branchId);
    const filterSql = this.eventFilterSql({ ...filters, branchIds });

    const rows = await this.prisma.$queryRaw<
      { person_id: string; first_name: string; last_name: string; absences: bigint; considered: bigint }[]
    >`
      WITH ranked_events AS (
        SELECT ev.id, ev.branch_id, ev.event_date,
          ROW_NUMBER() OVER (PARTITION BY ev.branch_id ORDER BY ev.event_date DESC) AS rn
        FROM membresia.events ev
        WHERE ev.institution_id = ${institutionId}::uuid ${filterSql}
      ),
      recent_events AS (
        SELECT id FROM ranked_events WHERE rn <= 8
      )
      SELECT p.id AS person_id, p.first_name, p.last_name,
        COUNT(*) FILTER (WHERE ct.code = 'ABSENT') AS absences,
        COUNT(*) AS considered
      FROM membresia.event_attendance ea
      JOIN recent_events re ON re.id = ea.event_id
      JOIN membresia.persons p ON p.id = ea.person_id
      JOIN general.catalog_items ct ON ct.id = ea.status_id
      WHERE p.is_active = true
      GROUP BY p.id, p.first_name, p.last_name
      HAVING COUNT(*) FILTER (WHERE ct.code = 'ABSENT') >= 2
      ORDER BY absences DESC, considered DESC
      LIMIT ${limit}
    `;

    return rows.map((r) => ({
      personId: r.person_id,
      firstName: r.first_name,
      lastName: r.last_name,
      absences: Number(r.absences),
      considered: Number(r.considered),
    }));
  }
}
