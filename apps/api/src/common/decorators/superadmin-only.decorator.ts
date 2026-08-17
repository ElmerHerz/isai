import { SetMetadata } from '@nestjs/common';

/**
 * @SuperadminOnly()
 *
 * Para endpoints que solo puede usar un superadmin de la plataforma —
 * catálogos globales sin tenantId (currencies, countries, languages,
 * institution-types, catalog-items). No hay un permiso delegable para
 * esto: afectaría a todos los tenants a la vez, así que no depende de
 * `permissions[]` como @RequirePermission, solo del flag `isSuperadmin`
 * calculado en el JWT.
 *
 * Antes estos endpoints no tenían ningún decorador y dependían del
 * default (peligroso) de PermissionsGuard, verificando isSuperadmin a mano
 * dentro del service. Ahora el guard lo exige de forma explícita y central.
 */
export const SUPERADMIN_ONLY_KEY = 'superadmin_only';
export const SuperadminOnly = () => SetMetadata(SUPERADMIN_ONLY_KEY, true);
