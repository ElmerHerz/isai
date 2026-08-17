import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { resolveTenantId } from '../utils/resolve-tenant-id';

/**
 * @CurrentTenant() extrae el tenant activo de la request.
 *
 * Regla: para un usuario normal, NUNCA se confía en un tenant_id que venga
 * del body/query — siempre se obtiene del JWT del usuario autenticado.
 *
 * Puede devolver `null`: significa que quien hace la request es superadmin
 * (tenantId=null en el JWT) y no seleccionó un tenant específico vía
 * ?tenantId=. Cada endpoint decide qué hacer con null (ver resolveTenantId).
 *
 * Uso en controller:
 * findAll(@CurrentTenant() tenantId: string | null) { ... }
 */
export const CurrentTenant = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string | null => {
    const request = ctx.switchToHttp().getRequest();
    return resolveTenantId(request);
  },
);
