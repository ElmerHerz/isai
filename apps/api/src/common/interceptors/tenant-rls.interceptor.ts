import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { resolveTenantId } from '../utils/resolve-tenant-id';
import { tenantContextStorage } from '../prisma/tenant-context';

/**
 * TenantRlsInterceptor — Propaga el tenant_id activo de la request al
 * contexto de PrismaService (vía AsyncLocalStorage) para que su middleware
 * ejecute SET LOCAL app.current_tenant_id y las políticas RLS de Postgres
 * actúen de verdad, no solo el filtro `where: tenantId` de cada service.
 *
 * Regla: para un usuario normal, NUNCA se confía en un tenant_id del
 * body/query — siempre viene de request.user (JWT ya validado por
 * JwtAuthGuard). Un superadmin (tenantId=null en el JWT) puede seleccionar
 * un tenant vía ?tenantId=; si no lo hace, no se setea nada y, tal como
 * describe el diseño de RLS, un app.current_tenant_id sin setear se asume
 * contexto de superadmin (sin filtro).
 */
@Injectable()
export class TenantRlsInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<{
      user?: { tenantId?: string | null };
      query?: Record<string, unknown>;
      tenantId?: string;
    }>();

    const tenantId = resolveTenantId(request);

    if (tenantId) {
      request.tenantId = tenantId;
    }

    // El handler completo (guards ya corrieron; esto envuelve la ejecución
    // del controller/service) corre dentro del contexto de AsyncLocalStorage
    // para que PrismaService pueda leer el tenant activo sin pasarlo a mano
    // por cada llamada.
    return new Observable((subscriber) => {
      tenantContextStorage.run({ tenantId }, () => {
        const subscription = next.handle().subscribe(subscriber);
        return () => subscription.unsubscribe();
      });
    });
  }
}
