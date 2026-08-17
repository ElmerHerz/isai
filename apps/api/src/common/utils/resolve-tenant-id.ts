/**
 * resolveTenantId — Determina el tenant "activo" de la request.
 *
 * Regla: para un usuario normal, el tenant SIEMPRE viene del JWT — nunca
 * se confía en un tenant_id del query/body (rule #5 de arquitectura).
 *
 * Excepción: un usuario con tenantId=null en el JWT es superadmin de la
 * plataforma (acceso total, sin tenant propio). Para poder operar sobre un
 * tenant específico, puede indicarlo explícitamente con ?tenantId=<uuid>.
 * Sin ese query param, no hay tenant activo (null) — los endpoints de
 * lectura lo interpretan como "todos los tenants"; los de escritura deben
 * rechazar la operación si la necesitan.
 */
export function resolveTenantId(request: {
  user?: { tenantId?: string | null };
  query?: Record<string, unknown>;
}): string | null {
  const jwtTenantId = request.user?.tenantId;

  if (jwtTenantId) {
    return jwtTenantId;
  }

  const requestedTenantId = request.query?.tenantId;
  return typeof requestedTenantId === 'string' ? requestedTenantId : null;
}
