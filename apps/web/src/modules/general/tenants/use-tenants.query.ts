import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { Tenant } from '@isai/shared-types';

export const TENANTS_QUERY_KEY = ['tenants'] as const;

/**
 * useTenantsQuery — TanStack Query para listar tenants.
 *
 * El apiClient inyecta el JWT automáticamente.
 * El backend aplica RLS — solo devuelve datos del tenant del usuario.
 */
export function useTenantsQuery(enabled = true) {
  return useQuery({
    queryKey: TENANTS_QUERY_KEY,
    queryFn: async () => {
      const { data } = await apiClient.get<Tenant[]>('/tenants');
      return data;
    },
    // GET /tenants pide core.tenant.view — hoy solo superadmin lo tiene
    // (nunca se le dio pantalla/permiso propio a Tenants para un tenant
    // normal). Sin esto, cualquier diálogo que use este hook lo llama al
    // montar aunque esté cerrado y un usuario no-superadmin nunca vaya a
    // usar el picker de tenant, y el 403 ahora se ve como toast de error.
    enabled,
  });
}
