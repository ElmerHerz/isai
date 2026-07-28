/**
 * @isai/shared-utils
 *
 * Constantes compartidas entre API y Web:
 * - Códigos de módulos (MODULE_CODES)
 * - Códigos de permisos (PERMISSIONS)
 *
 * Regla: Formato de permisos SIEMPRE: modulo.recurso.accion (minúsculas, sin excepciones).
 * Agregar los permisos de un nuevo módulo aquí antes de usarlos en @RequirePermission().
 */

// ─── Códigos de Módulos ───────────────────────────────────────────────────────

export const MODULE_CODES = {
  GENERAL: 'general',
  SECURITY: 'security',
  // Futuros módulos:
  // MEMBERSHIP: 'membership',
  // FINANCE: 'finance',
  // INVENTORY: 'inventory',
} as const;

export type ModuleCode = typeof MODULE_CODES[keyof typeof MODULE_CODES];

// ─── Permisos por Módulo ─────────────────────────────────────────────────────
// Formato estricto: modulo.recurso.accion

export const PERMISSIONS = {
  // Módulo: General
  GENERAL: {
    TENANT: {
      READ: 'general.tenant.read',
      CREATE: 'general.tenant.create',
      UPDATE: 'general.tenant.update',
      DELETE: 'general.tenant.delete',
    },
    INSTITUTION: {
      READ: 'general.institution.read',
      CREATE: 'general.institution.create',
      UPDATE: 'general.institution.update',
      DELETE: 'general.institution.delete',
    },
    BRANCH: {
      READ: 'general.branch.read',
      CREATE: 'general.branch.create',
      UPDATE: 'general.branch.update',
      DELETE: 'general.branch.delete',
    },
  },

  // Módulo: Security
  SECURITY: {
    USER: {
      READ: 'security.user.read',
      CREATE: 'security.user.create',
      UPDATE: 'security.user.update',
      DELETE: 'security.user.delete',
    },
    ROLE: {
      READ: 'security.role.read',
      CREATE: 'security.role.create',
      UPDATE: 'security.role.update',
      DELETE: 'security.role.delete',
    },
    PERMISSION: {
      READ: 'security.permission.read',
    },
  },

  // Plantilla para nuevo módulo:
  // FINANCE: {
  //   INVOICE: {
  //     READ: 'finance.invoice.read',
  //     CREATE: 'finance.invoice.create',
  //     UPDATE: 'finance.invoice.update',
  //     DELETE: 'finance.invoice.delete',
  //   },
  // },
} as const;

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Verifica si un usuario tiene un permiso específico */
export function hasPermission(userPermissions: string[], permission: string): boolean {
  return userPermissions.includes(permission);
}

/** Verifica si un usuario tiene TODOS los permisos dados */
export function hasAllPermissions(userPermissions: string[], permissions: string[]): boolean {
  return permissions.every((p) => userPermissions.includes(p));
}

/** Verifica si un usuario tiene AL MENOS UNO de los permisos dados */
export function hasAnyPermission(userPermissions: string[], permissions: string[]): boolean {
  return permissions.some((p) => userPermissions.includes(p));
}
