import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { BranchWithInstitution } from '@isai/shared-types';

export const ALL_BRANCHES_QUERY_KEY = ['branches', 'all'] as const;

export function useAllBranchesQuery() {
  return useQuery({
    queryKey: ALL_BRANCHES_QUERY_KEY,
    queryFn: async () => {
      const { data } = await apiClient.get<BranchWithInstitution[]>('/branches');
      return data;
    },
  });
}
