import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSION_KEY } from '../decorators/require-permission.decorator';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

/**
 * PermissionsGuard — Guard global que verifica permisos efectivos del usuario.
 *
 * Regla: NINGÚN endpoint que devuelva datos de negocio se salta este guard.
 * Los permisos efectivos se leen de Redis (cacheados) para evitar queries a BD
 * en cada request.
 *
 * Formato de permiso: modulo.recurso.accion (ej: finance.invoice.create)
 *
 * Flujo:
 * JwtAuthGuard → PermissionsGuard → lee @RequirePermission() del handler
 *   → busca en permisos cacheados del usuario → permite o lanza 403
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Endpoints @Public() no requieren permisos
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    // Obtiene el permiso requerido por el handler (@RequirePermission)
    const requiredPermission = this.reflector.getAllAndOverride<string>(
      PERMISSION_KEY,
      [context.getHandler(), context.getClass()],
    );

    // Si no hay @RequirePermission, se permite el acceso (para endpoints internos)
    // NOTA: En producción considera lanzar un error aquí para forzar siempre el decorador
    if (!requiredPermission) return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user as { permissions?: string[] } | undefined;

    // Los permisos efectivos son inyectados en request.user por la estrategia JWT
    // (pre-cargados desde Redis al autenticar)
    const userPermissions: string[] = user?.permissions ?? [];

    const hasPermission = userPermissions.includes(requiredPermission);

    if (!hasPermission) {
      throw new ForbiddenException(
        `No tienes el permiso requerido: "${requiredPermission}"`,
      );
    }

    return true;
  }
}
