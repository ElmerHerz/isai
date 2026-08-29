import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { PendingApprovalRow } from '@isai/shared-types';

export const myPendingApprovalsKey = ['expense-approvals', 'mine'] as const;

export function useMyPendingApprovalsQuery() {
  return useQuery({
    queryKey: myPendingApprovalsKey,
    queryFn: async () => {
      const { data } = await apiClient.get<PendingApprovalRow[]>('/expense-approvals/mine');
      return data;
    },
  });
}
