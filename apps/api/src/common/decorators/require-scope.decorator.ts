import { SetMetadata } from '@nestjs/common';

export type ScopeLevel = 'institution' | 'branch';

export interface RequireScopeOptions {
  level: ScopeLevel;
  /** Route param con el institutionId — default 'institutionId'. */
  institutionIdParam?: string;
  /** Route param con el branchId (solo level: 'branch') — default 'branchId'. */
  branchIdParam?: string;
}

/**
 * @RequireScope({ level: 'institution' | 'branch', ... })
 *
 * Afirma que el usuario tiene alcance (vía seguridad.user_roles) sobre la
 * institución/sucursal identificada por un route param — no reemplaza a
 * @RequirePermission (acción), lo complementa (recurso). Leído por
 * ScopeGuard, que también resuelve el bypass de superadmin.
 *
 * Solo para endpoints que operan sobre UN recurso identificado en la URL.
 * Los endpoints de listado agregado (ej. "todas mis sucursales") siguen
 * filtrando con resolveInstitutionScope/resolveBranchScope/resolveAllBranchesScope
 * directo en el service — este decorador no construye filtros, solo
 * permite o corta con 404 antes de llegar al handler.
 */
export const SCOPE_KEY = 'require_scope';
export const RequireScope = (options: RequireScopeOptions) => SetMetadata(SCOPE_KEY, options);
