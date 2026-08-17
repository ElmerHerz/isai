import { Injectable, CanActivate, ExecutionContext, ForbiddenException, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSION_KEY } from '../decorators/require-permission.decorator';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { SUPERADMIN_ONLY_KEY } from '../decorators/superadmin-only.decorator';
import { ANY_AUTHENTICATED_USER_KEY } from '../decorators/any-authenticated-user.decorator';

const DENIED_MESSAGE = 'No tienes permiso para realizar esta acción.';

/**
 * PermissionsGuard — Guard global que verifica permisos efectivos del usuario.
 *
 * Regla: NINGÚN endpoint que devuelva datos de negocio se salta este guard.
 * Los permisos efectivos van embebidos en el JWT (calculados una vez en el
 * login, ver AuthService) — no hay dependencia de Redis ni de una consulta
 * a BD por request.
 *
 * Formato de permiso: modulo.recurso.accion (ej: finance.invoice.create)
 *
 * Flujo:
 * JwtAuthGuard → PermissionsGuard → lee @RequirePermission()/@SuperadminOnly()
 *   del handler → permite o lanza 403
 *
 * Default fail-closed: un handler sin @RequirePermission, @Public(),
 * @SuperadminOnly() ni @AnyAuthenticatedUser() es rechazado, no permitido.
 * Antes el default era permitir el acceso a cualquier usuario autenticado —
 * un endpoint nuevo agregado sin acordarse del decorador quedaba abierto en
 * silencio. Los endpoints de "autoservicio" (devuelven datos del propio
 * usuario, ej. GET /auth/me) usan @AnyAuthenticatedUser() explícitamente en
 * vez de depender de ese default viejo.
 *
 * Mensajes al cliente: siempre genéricos (DENIED_MESSAGE) — el código de
 * permiso exacto, o la razón puntual del rechazo, solo se registra en el log
 * del servidor. No es una vulnerabilidad exponerlo (los códigos ya son
 * visibles para cualquier admin en la pantalla de Roles), pero un usuario
 * sin el permiso no puede hacer nada útil con ese dato — es información
 * interna innecesaria en la respuesta.
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  private readonly logger = new Logger(PermissionsGuard.name);

  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Endpoints @Public() no requieren permisos
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user as { userId?: string; permissions?: string[]; isSuperadmin?: boolean } | undefined;
    const handlerName = `${context.getClass().name}.${context.getHandler().name}`;

    const superadminOnly = this.reflector.getAllAndOverride<boolean>(SUPERADMIN_ONLY_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (superadminOnly) {
      if (!user?.isSuperadmin) {
        this.logger.warn(`Rechazado (requiere superadmin): userId=${user?.userId} handler=${handlerName}`);
        throw new ForbiddenException(DENIED_MESSAGE);
      }
      return true;
    }

    const anyAuthenticatedUser = this.reflector.getAllAndOverride<boolean>(ANY_AUTHENTICATED_USER_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (anyAuthenticatedUser) return true;

    const requiredPermission = this.reflector.getAllAndOverride<string>(
      PERMISSION_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredPermission) {
      // Bug de configuración, no un rechazo normal — vale la pena que quede
      // como error (no warn) en el log para que se note en desarrollo.
      this.logger.error(`Handler sin control de acceso definido: ${handlerName}`);
      throw new ForbiddenException(DENIED_MESSAGE);
    }

    // Superadmin = acceso total a la plataforma, bypass de cualquier permiso.
    if (user?.isSuperadmin) return true;

    const userPermissions: string[] = user?.permissions ?? [];

    const hasPermission = userPermissions.includes(requiredPermission);

    if (!hasPermission) {
      this.logger.warn(
        `Permiso denegado: userId=${user?.userId} permiso=${requiredPermission} handler=${handlerName}`,
      );
      throw new ForbiddenException(DENIED_MESSAGE);
    }

    return true;
  }
}
