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
// enabled adicional (default true) — quien llama debe apagarlo si sabe que
// el usuario actual no tiene security.role.view (ej. un diálogo que se
// monta siempre, aunque cerrado, en una página que también visitan roles
// angostos), para no dispararle un 403 solo por abrir la página.
export function useRolesQuery(tenantId?: string, enabled: boolean = true) {
  return useQuery({
    queryKey: rolesQueryKey(tenantId),
    queryFn: async () => {
      const { data } = await apiClient.get<RoleWithPermissions[]>('/roles', {
        params: tenantId ? { tenantId } : undefined,
      });
      return data;
    },
    enabled,
  });
}
