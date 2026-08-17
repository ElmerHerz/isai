import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { BranchWithInstitution } from '@isai/shared-types';

export const branchQueryKey = (branchId: string) => ['branches', 'detail', branchId] as const;

export function useBranchQuery(branchId: string) {
  return useQuery({
    queryKey: branchQueryKey(branchId),
    queryFn: async () => {
      const { data } = await apiClient.get<BranchWithInstitution>(`/branches/${branchId}`);
      return data;
    },
    enabled: !!branchId,
  });
}
