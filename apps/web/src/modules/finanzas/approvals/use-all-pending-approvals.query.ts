import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { PendingApprovalRow } from '@isai/shared-types';

export const allPendingApprovalsKey = ['expense-approvals', 'all'] as const;

// enabled adicional (default true) — quien llama debe apagarlo si sabe que
// el usuario actual no tiene finance.approval_route.view (ver
// $groupId.tsx/etc de esta sesión para el mismo criterio), para no
// dispararle un 403 solo por entrar a la pantalla.
export function useAllPendingApprovalsQuery(enabled: boolean = true) {
  return useQuery({
    queryKey: allPendingApprovalsKey,
    queryFn: async () => {
      const { data } = await apiClient.get<PendingApprovalRow[]>('/expense-approvals');
      return data;
    },
    enabled,
  });
}
