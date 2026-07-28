import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';

/**
 * TenantRlsInterceptor — Inyecta el tenant_id del usuario autenticado
 * en el contexto de Postgres para que las políticas RLS actúen.
 *
 * Ejecuta: SET LOCAL app.current_tenant_id = '<tenant_id>'
 * en cada transacción, antes de que el service acceda a Prisma.
 *
 * Regla: NUNCA se confía en un tenant_id del body/query.
 * Siempre se obtiene de request.user (JWT ya validado por JwtAuthGuard).
 *
 * NOTA: La implementación completa requiere un middleware de transacción Prisma
 * ($transaction con SET LOCAL). Este interceptor establece el contexto en la
 * request para que PrismaService lo use al iniciar transacciones.
 */
@Injectable()
export class TenantRlsInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<{
      user?: { tenantId?: string };
      tenantId?: string;
    }>();

    // Extrae tenant_id del JWT (ya validado por JwtAuthGuard)
    const tenantId = request.user?.tenantId;

    if (tenantId) {
      // Coloca tenantId en el request para acceso en toda la cadena
      request.tenantId = tenantId;
      // TODO: Ejecutar SET LOCAL app.current_tenant_id usando Prisma middleware
      // cuando se implemente la capa de transacciones explícitas
    }

    return next.handle();
  }
}
