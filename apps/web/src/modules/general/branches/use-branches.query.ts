import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { Branch } from '@isai/shared-types';

export const branchesQueryKey = (institutionId: string) =>
  ['branches', institutionId] as const;

// enabled adicional (default true) — quien llama debe apagarlo si sabe que
// el usuario actual no tiene core.branch.view (ej. un diálogo que se monta
// siempre, aunque cerrado, en una página que también visitan roles
// angostos), para no dispararle un 403 solo por abrir la página. Mismo
// criterio que usePersonsQuery/useRolesQuery.
export function useBranchesQuery(institutionId: string, enabled: boolean = true) {
  return useQuery({
    queryKey: branchesQueryKey(institutionId),
    queryFn: async () => {
      const { data } = await apiClient.get<Branch[]>(`/institutions/${institutionId}/branches`);
      return data;
    },
    enabled: !!institutionId && enabled,
  });
}
