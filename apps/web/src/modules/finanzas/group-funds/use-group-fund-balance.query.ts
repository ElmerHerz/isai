import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { GroupFundBalance } from '@isai/shared-types';

export const groupFundBalanceKey = (groupId: string) => ['groups', 'detail', groupId, 'fund-balance'] as const;

// enabled adicional (default true) — quien llama debe apagarlo si el
// usuario no tiene finance.group_fund.view, para no dispararle un 403 (y su
// toast automático, ver api-client.ts) a cualquiera que simplemente abra la
// página de un grupo sin tener permiso de finanzas (ej. Pastor).
export function useGroupFundBalanceQuery(groupId: string, enabled: boolean = true) {
  return useQuery({
    queryKey: groupFundBalanceKey(groupId),
    queryFn: async () => {
      const { data } = await apiClient.get<GroupFundBalance>(`/groups/${groupId}/fund-balance`);
      return data;
    },
    enabled: !!groupId && enabled,
  });
}
