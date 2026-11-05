import { SetMetadata } from '@nestjs/common';

/**
 * @AllowWhileMustChangePassword()
 *
 * MustChangePasswordGuard bloquea con 403 (code: MUST_CHANGE_PASSWORD) a
 * cualquier usuario autenticado con mustChangePassword=true, salvo los
 * handlers marcados con este decorador — el puñado de endpoints que ese
 * usuario SÍ necesita poder llamar mientras está atrapado en el flujo de
 * cambio obligatorio: cambiar su propia contraseña, ver su perfil, cerrar
 * sesión. Mismo patrón SetMetadata que @AnyAuthenticatedUser()/@Public().
 */
export const ALLOW_WHILE_MUST_CHANGE_PASSWORD_KEY = 'allow_while_must_change_password';
export const AllowWhileMustChangePassword = () => SetMetadata(ALLOW_WHILE_MUST_CHANGE_PASSWORD_KEY, true);
