import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { PermissionWithModule } from '@isai/shared-types';

export const PERMISSIONS_QUERY_KEY = ['permissions'] as const;

/** usePermissionsQuery — Catálogo completo de permisos, con su módulo dueño. */
export function usePermissionsQuery() {
  return useQuery({
    queryKey: PERMISSIONS_QUERY_KEY,
    queryFn: async () => {
      const { data } = await apiClient.get<PermissionWithModule[]>('/permissions');
      return data;
    },
    staleTime: Infinity,
  });
}
