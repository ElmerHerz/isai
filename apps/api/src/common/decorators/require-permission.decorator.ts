import { SetMetadata } from '@nestjs/common';

/**
 * Clave de metadata usada por PermissionsGuard para leer el permiso requerido.
 */
export const PERMISSION_KEY = 'required_permission';

/**
 * @RequirePermission('modulo.recurso.accion')
 *
 * Regla: Formato ESTRICTO → modulo.recurso.accion en minúsculas.
 * Ejemplos: 'general.tenant.read', 'finance.invoice.create', 'security.user.delete'
 *
 * Regla: NINGÚN endpoint que devuelva datos de negocio puede omitir este decorador.
 * Si el endpoint debe ser público, usa @Public() en su lugar.
 */
export const RequirePermission = (permission: string) =>
  SetMetadata(PERMISSION_KEY, permission);
