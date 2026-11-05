import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { ALLOW_WHILE_MUST_CHANGE_PASSWORD_KEY } from '../decorators/allow-while-must-change-password.decorator';

/**
 * MustChangePasswordGuard — Guard global que bloquea el resto de la API
 * mientras el usuario tenga mustChangePassword=true (contraseña temporal
 * asignada por un admin, o recién restablecida — ver UsersService.resetPassword).
 *
 * Flujo: JwtAuthGuard → PermissionsGuard → MustChangePasswordGuard → ScopeGuard.
 * Corre DESPUÉS de PermissionsGuard a propósito: si el usuario ni siquiera
 * tiene el permiso del endpoint, ese es el error que debe ver, no este.
 *
 * El code MUST_CHANGE_PASSWORD explícito en el body es lo que el
 * interceptor de axios del frontend usa para distinguir este 403 de un
 * 403 normal de permisos y redirigir a /change-password en vez de
 * mostrar el toast de error genérico.
 */
@Injectable()
export class MustChangePasswordGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const allowed = this.reflector.getAllAndOverride<boolean>(ALLOW_WHILE_MUST_CHANGE_PASSWORD_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (allowed) return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user as { mustChangePassword?: boolean } | undefined;

    if (user?.mustChangePassword) {
      throw new ForbiddenException({
        code: 'MUST_CHANGE_PASSWORD',
        message: 'Debes cambiar tu contraseña antes de continuar.',
      });
    }

    return true;
  }
}
