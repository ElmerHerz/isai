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
export function useTenantsQuery() {
  return useQuery({
    queryKey: TENANTS_QUERY_KEY,
    queryFn: async () => {
      const { data } = await apiClient.get<Tenant[]>('/tenants');
      return data;
    },
  });
}
