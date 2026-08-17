import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { BranchSchedule } from '@isai/shared-types';

export const branchSchedulesQueryKey = (branchId: string) => ['branches', branchId, 'schedules'] as const;

export function useBranchSchedulesQuery(branchId: string) {
  return useQuery({
    queryKey: branchSchedulesQueryKey(branchId),
    queryFn: async () => {
      const { data } = await apiClient.get<BranchSchedule[]>(`/branches/${branchId}/schedules`);
      return data;
    },
    enabled: !!branchId,
  });
}
