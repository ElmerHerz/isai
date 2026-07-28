import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * @CurrentTenant() extrae el tenantId del JWT/request autenticado.
 *
 * Regla: NUNCA se confía en un tenant_id que venga del body/query.
 * Siempre se obtiene del JWT del usuario autenticado.
 *
 * Uso en controller:
 * findAll(@CurrentTenant() tenantId: string) { ... }
 */
export const CurrentTenant = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest();
    // El TenantRlsInterceptor y JwtAuthGuard ya colocaron tenant_id en request.user
    return request.user?.tenantId as string;
  },
);
