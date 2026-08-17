import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { Branch } from '@isai/shared-types';

export const branchesQueryKey = (institutionId: string) =>
  ['branches', institutionId] as const;

export function useBranchesQuery(institutionId: string) {
  return useQuery({
    queryKey: branchesQueryKey(institutionId),
    queryFn: async () => {
      const { data } = await apiClient.get<Branch[]>(`/institutions/${institutionId}/branches`);
      return data;
    },
    enabled: !!institutionId,
  });
}
