import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { RoleWithPermissions } from '@isai/shared-types';

export const rolesQueryKey = (tenantId?: string) => ['roles', tenantId ?? null] as const;

/**
 * useRolesQuery — Lista roles asignables (incluye los de sistema, ej. "admin",
 * además de los propios del tenant — ver fix en RolesService.findAll).
 *
 * tenantId opcional: cuando el llamador es superadmin y ya eligió un tenant
 * (ej. en el formulario de crear usuario), se manda como query param para
 * traer los roles de ESE tenant en particular.
 */
export function useRolesQuery(tenantId?: string) {
  return useQuery({
    queryKey: rolesQueryKey(tenantId),
    queryFn: async () => {
      const { data } = await apiClient.get<RoleWithPermissions[]>('/roles', {
        params: tenantId ? { tenantId } : undefined,
      });
      return data;
    },
  });
}
