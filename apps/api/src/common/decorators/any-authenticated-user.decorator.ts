import { SetMetadata } from '@nestjs/common';

/**
 * @AnyAuthenticatedUser()
 *
 * Dos casos de uso legítimos:
 * 1. Endpoints de "autoservicio" — devuelven o modifican datos del propio
 *    usuario autenticado (ej. GET /auth/me, GET /menus/me), no un recurso de
 *    negocio con dueño distinto.
 * 2. Catálogos/referencia genéricos y sin sensibilidad — datos tipo enum
 *    compartidos por varios módulos (ej. GET /catalog-items: tipos de cuenta,
 *    tipos de grupo, etc. — la tabla ni siquiera tiene tenant_id propio). No
 *    tiene sentido gatear la LECTURA de esas etiquetas detrás del permiso de
 *    negocio de un módulo puntual — eso solo rompe a cualquier otro módulo
 *    que también necesite leerlas (ver auditoría de sesión: un Tesorero con
 *    finance.account.create legítimo no podía ver el selector de tipos de
 *    cuenta porque el endpoint exigía core.institution.view).
 *
 * En ambos casos: no hay un permiso de negocio que tenga sentido asignar —
 * cualquier usuario con un JWT válido puede llamarlos, JwtAuthGuard ya
 * garantiza esa parte.
 *
 * Distinto de @Public(): el JWT sigue siendo obligatorio, solo se salta el
 * chequeo de `permissions[]`. Sin este decorador (ni @RequirePermission ni
 * @SuperadminOnly), PermissionsGuard rechaza el endpoint por defecto.
 */
export const ANY_AUTHENTICATED_USER_KEY = 'any_authenticated_user';
export const AnyAuthenticatedUser = () => SetMetadata(ANY_AUTHENTICATED_USER_KEY, true);
