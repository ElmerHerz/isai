import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { ApprovalRoute } from '@isai/shared-types';

export const approvalRoutesQueryKey = ['approval-routes'] as const;

export function useApprovalRoutesQuery() {
  return useQuery({
    queryKey: approvalRoutesQueryKey,
    queryFn: async () => {
      const { data } = await apiClient.get<ApprovalRoute[]>('/approval-routes');
      return data;
    },
  });
}
