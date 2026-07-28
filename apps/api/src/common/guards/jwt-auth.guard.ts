import { Injectable, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

/**
 * JwtAuthGuard — Guard global que protege TODOS los endpoints por defecto.
 *
 * Regla: Si un endpoint es realmente público, se marca con @Public().
 * Nunca se hace público por omisión (sin el decorador).
 *
 * Flujo:
 * Request → JwtAuthGuard → (si no es @Public()) → valida Bearer JWT
 *   → coloca payload en request.user → sigue al PermissionsGuard
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private readonly reflector: Reflector) {
    super();
  }

  override canActivate(context: ExecutionContext) {
    // Verifica si el handler o la clase tienen @Public()
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true; // Endpoint explícitamente público → no requiere JWT
    }

    return super.canActivate(context);
  }
}
