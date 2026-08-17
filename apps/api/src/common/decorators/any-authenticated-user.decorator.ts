import { SetMetadata } from '@nestjs/common';

/**
 * @AnyAuthenticatedUser()
 *
 * Para endpoints de "autoservicio" — devuelven o modifican datos del propio
 * usuario autenticado (ej. GET /auth/me, GET /menus/me), no un recurso de
 * negocio con dueño distinto. No hay un permiso que tenga sentido asignar
 * para "ver mi propio perfil": cualquier usuario con un JWT válido puede
 * llamarlos, JwtAuthGuard ya garantiza esa parte.
 *
 * Distinto de @Public(): el JWT sigue siendo obligatorio, solo se salta el
 * chequeo de `permissions[]`. Sin este decorador (ni @RequirePermission ni
 * @SuperadminOnly), PermissionsGuard rechaza el endpoint por defecto.
 */
export const ANY_AUTHENTICATED_USER_KEY = 'any_authenticated_user';
export const AnyAuthenticatedUser = () => SetMetadata(ANY_AUTHENTICATED_USER_KEY, true);
