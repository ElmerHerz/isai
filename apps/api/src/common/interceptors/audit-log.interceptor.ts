import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

// /auth/* nunca — nunca queremos que un password o un token (aunque sea de
// un solo uso) terminen en newValues. /import/preview es un POST que no
// escribe nada (solo previsualiza) — loguearlo como "create" sería mentira.
const EXCLUDED_PATH_SUBSTRINGS = ['/auth/', '/import/preview'];

const ACTION_BY_METHOD: Record<string, string> = {
  POST: 'create',
  PUT: 'update',
  PATCH: 'update',
  DELETE: 'delete',
};

const SENSITIVE_KEYS = new Set(['password', 'passwordHash', 'accessToken', 'refreshToken', 'token']);

// Defensa en profundidad además de la exclusión de /auth/ arriba — por si
// algún día otro endpoint devuelve uno de estos campos.
function sanitize(value: unknown, depth = 0): unknown {
  if (depth > 4 || value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map((item) => sanitize(item, depth + 1));
  const result: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
    if (!SENSITIVE_KEYS.has(key)) result[key] = sanitize(val, depth + 1);
  }
  return result;
}

interface AuditRequest {
  method: string;
  url: string;
  params?: Record<string, string>;
  user?: { userId?: string; tenantId?: string | null };
  /** Tenant EFECTIVO de la request, seteado por TenantRlsInterceptor (que
   * corre antes que este) — puede diferir de user.tenantId cuando un
   * superadmin opera sobre un tenant vía ?tenantId=. */
  tenantId?: string;
  ip?: string;
  headers: Record<string, string | string[] | undefined>;
}

/**
 * AuditLogInterceptor — registra en seguridad.audit_logs cada mutación
 * exitosa (POST/PUT/PATCH/DELETE) de cualquier endpoint, sin que cada
 * controller/service lo haga a mano.
 *
 * Simplificación deliberada: solo guarda el estado RESULTANTE (newValues, el
 * body de la respuesta) — oldValues queda null. Capturar un "antes"
 * genérico necesitaría un mapeo ruta -> modelo de Prisma para buscarlo
 * antes de que el handler lo modifique; se deja para si hace falta.
 *
 * El insert es "fire and forget" (no bloquea la respuesta al cliente) — que
 * falle el log nunca debe tumbar la request real.
 */
@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditLogInterceptor.name);

  constructor(private readonly prisma: PrismaService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<AuditRequest>();
    const method = request.method?.toUpperCase();

    if (!MUTATING_METHODS.has(method)) {
      return next.handle();
    }

    const path = request.url.split('?')[0] ?? request.url;
    if (EXCLUDED_PATH_SUBSTRINGS.some((s) => path.includes(s))) {
      return next.handle();
    }

    return next.handle().pipe(
      tap((responseBody) => {
        this.record(method, path, request, responseBody).catch((err: Error) => {
          this.logger.error(`No se pudo escribir el log de auditoría: ${err.message}`);
        });
      }),
    );
  }

  private async record(method: string, path: string, request: AuditRequest, responseBody: unknown) {
    // /api/v1/persons/:id -> "persons"; /api/v1/group-positions -> "group-positions"
    const segments = path.replace(/^\/api\/v\d+\//, '').split('/').filter(Boolean);
    const entityType = segments[0] ?? null;

    const bodyRecord = responseBody as { id?: string } | null | undefined;
    const entityId = request.params?.id ?? bodyRecord?.id ?? null;

    const userAgentHeader = request.headers['user-agent'];
    const userAgent = Array.isArray(userAgentHeader) ? userAgentHeader[0] : userAgentHeader;

    await this.prisma.auditLog.create({
      data: {
        // request.tenantId (seteado por TenantRlsInterceptor, que corre
        // antes) es el tenant EFECTIVO de la operación — para un superadmin
        // operando vía ?tenantId=, user.tenantId sigue siendo null aunque la
        // mutación sí afecte a un tenant concreto (hallazgo de auditoría de
        // sesión: antes se guardaba tenantId: null en ese caso, y la
        // bitácora de ese tenant nunca mostraba esas acciones).
        tenantId: request.tenantId ?? request.user?.tenantId ?? null,
        userId: request.user?.userId ?? null,
        action: ACTION_BY_METHOD[method] ?? method.toLowerCase(),
        entityType,
        entityId,
        newValues: sanitize(responseBody) as Prisma.InputJsonValue,
        ipAddress: request.ip,
        userAgent: userAgent?.slice(0, 500),
      },
    });
  }
}
