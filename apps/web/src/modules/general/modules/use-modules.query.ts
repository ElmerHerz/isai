import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { Module } from '@isai/shared-types';

export const MODULES_QUERY_KEY = ['modules'] as const;

// GET /modules es @SuperadminOnly() — enabled debe venir en false para
// cualquier pantalla que monte este hook sin ser superadmin (mismo
// criterio que useTenantsQuery, ver su comentario).
export function useModulesQuery(enabled = true) {
  return useQuery({
    queryKey: MODULES_QUERY_KEY,
    queryFn: async () => {
      const { data } = await apiClient.get<Module[]>('/modules');
      return data;
    },
    enabled,
  });
}
