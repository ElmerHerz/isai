import { PrismaService } from '../prisma/prisma.service';

/**
 * resolveInstitutionScope / resolveBranchScope — determinan a qué
 * instituciones/sucursales tiene acceso un usuario según sus filas en
 * seguridad.user_roles (institutionId/branchId), no solo su tenant.
 *
 * Hoy este scope se calcula en cada request (una query liviana a user_roles)
 * en vez de meterse en el JWT — no hay urgencia de optimizarlo porque
 * todavía no existe ninguna UI para asignar roles con scope a un usuario
 * que no sea superadmin (que siempre bypasea esto).
 */

export interface InstitutionScope {
  /** true = ve todas las instituciones del tenant, sin restricción */
  unrestricted: boolean;
  /** solo relevante si unrestricted === false */
  institutionIds: string[];
}

export async function resolveInstitutionScope(
  prisma: PrismaService,
  ctx: { userId: string; isSuperadmin: boolean },
): Promise<InstitutionScope> {
  if (ctx.isSuperadmin) {
    return { unrestricted: true, institutionIds: [] };
  }

  const rows = await prisma.userRole.findMany({
    where: { userId: ctx.userId },
    select: { institutionId: true },
  });

  // institutionId === null (chk_scope garantiza que branchId también es null)
  // => rol de todo el tenant => sin restricción.
  if (rows.some((r) => r.institutionId === null)) {
    return { unrestricted: true, institutionIds: [] };
  }

  const institutionIds = [
    ...new Set(rows.map((r) => r.institutionId).filter((id): id is string => id !== null)),
  ];
  return { unrestricted: false, institutionIds };
}

export interface BranchScope {
  /** true = ve todas las sucursales de ESA institución, sin restricción */
  unrestricted: boolean;
  /** solo relevante si unrestricted === false */
  branchIds: string[];
}

export async function resolveBranchScope(
  prisma: PrismaService,
  ctx: { userId: string; institutionId: string; isSuperadmin: boolean },
): Promise<BranchScope> {
  if (ctx.isSuperadmin) {
    return { unrestricted: true, branchIds: [] };
  }

  const rows = await prisma.userRole.findMany({
    where: {
      userId: ctx.userId,
      OR: [{ institutionId: null }, { institutionId: ctx.institutionId }],
    },
    select: { institutionId: true, branchId: true },
  });

  const tenantWide = rows.some((r) => r.institutionId === null);
  const wholeInstitution = rows.some(
    (r) => r.institutionId === ctx.institutionId && r.branchId === null,
  );
  if (tenantWide || wholeInstitution) {
    return { unrestricted: true, branchIds: [] };
  }

  const branchIds = [
    ...new Set(
      rows
        .filter((r) => r.institutionId === ctx.institutionId && r.branchId !== null)
        .map((r) => r.branchId as string),
    ),
  ];
  return { unrestricted: false, branchIds };
}

export interface GroupScope {
  /** true = ve todos los grupos de ESA institución, sin restricción */
  unrestricted: boolean;
  /** solo relevante si unrestricted === false */
  groupIds: string[];
}

/**
 * Igual criterio que resolveBranchScope pero para groupId — usado por
 * group-funds (un "Tesorero" con groupId puntual solo ve/opera el fondo de
 * SU grupo). Un rol institucional/tenant-wide (institutionId o branchId sin
 * groupId propio) da acceso sin restricción a todos los grupos de esa
 * institución; groupId es independiente de branchId, así que también se
 * revisan filas con institutionId + branchId puntual pero sin groupId.
 */
export async function resolveGroupScope(
  prisma: PrismaService,
  ctx: { userId: string; institutionId: string; isSuperadmin: boolean },
): Promise<GroupScope> {
  if (ctx.isSuperadmin) {
    return { unrestricted: true, groupIds: [] };
  }

  const rows = await prisma.userRole.findMany({
    where: {
      userId: ctx.userId,
      OR: [{ institutionId: null }, { institutionId: ctx.institutionId }],
    },
    select: { institutionId: true, groupId: true },
  });

  const tenantWide = rows.some((r) => r.institutionId === null);
  const wholeInstitution = rows.some(
    (r) => r.institutionId === ctx.institutionId && r.groupId === null,
  );
  if (tenantWide || wholeInstitution) {
    return { unrestricted: true, groupIds: [] };
  }

  const groupIds = [
    ...new Set(
      rows
        .filter((r) => r.institutionId === ctx.institutionId && r.groupId !== null)
        .map((r) => r.groupId as string),
    ),
  ];
  return { unrestricted: false, groupIds };
}

export interface AllBranchesScope {
  /** true = ve todas las sucursales del tenant, sin restricción */
  unrestricted: boolean;
  /** instituciones donde tiene scope de institución completa (sin branchId) */
  wholeInstitutionIds: string[];
  /** sucursales puntuales donde tiene scope (con institución + branchId) */
  branchIds: string[];
}

/**
 * Para la vista AGREGADA de sucursales (todas las instituciones del tenant
 * en una sola lista, /general/branches) — a diferencia de resolveBranchScope,
 * que resuelve el scope DENTRO de una institución ya conocida, esto combina
 * el scope de todas las instituciones/sucursales del usuario de una vez.
 * Un usuario con scope de una sola sucursal (ej. "Pastor" de una sede
 * puntual) NO debe ver las demás sucursales de esa misma institución aquí,
 * aunque la institución en sí esté dentro de su alcance.
 */
export async function resolveAllBranchesScope(
  prisma: PrismaService,
  ctx: { userId: string; isSuperadmin: boolean },
): Promise<AllBranchesScope> {
  if (ctx.isSuperadmin) {
    return { unrestricted: true, wholeInstitutionIds: [], branchIds: [] };
  }

  const rows = await prisma.userRole.findMany({
    where: { userId: ctx.userId },
    select: { institutionId: true, branchId: true },
  });

  if (rows.some((r) => r.institutionId === null)) {
    return { unrestricted: true, wholeInstitutionIds: [], branchIds: [] };
  }

  const wholeInstitutionIds = [
    ...new Set(
      rows
        .filter((r) => r.institutionId !== null && r.branchId === null)
        .map((r) => r.institutionId as string),
    ),
  ];
  const branchIds = [
    ...new Set(rows.filter((r) => r.branchId !== null).map((r) => r.branchId as string)),
  ];

  return { unrestricted: false, wholeInstitutionIds, branchIds };
}
