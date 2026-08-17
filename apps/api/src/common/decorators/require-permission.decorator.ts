import { SetMetadata } from '@nestjs/common';

/**
 * Clave de metadata usada por PermissionsGuard para leer el permiso requerido.
 */
export const PERMISSION_KEY = 'required_permission';

/**
 * @RequirePermission('modulo.recurso.accion')
 *
 * Regla: Formato ESTRICTO → modulo.recurso.accion en minúsculas, donde
 * modulo/recurso/accion deben existir como fila real en seguridad.permissions
 * (permissions.code es una columna GENERATED a partir de esas 3 columnas —
 * un string que "se ve bien" pero no tiene fila no sirve, el guard nunca lo
 * podrá matchear con ningún rol). Acción de lectura = "view", no "read".
 * Ejemplos: 'core.institution.view', 'finance.invoice.create', 'security.user.delete'
 *
 * Regla: NINGÚN endpoint que devuelva datos de negocio puede omitir este decorador.
 * Si el endpoint debe ser público, usa @Public() en su lugar.
 */
export const RequirePermission = (permission: string) =>
  SetMetadata(PERMISSION_KEY, permission);
