import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { GroupFundMovement } from '@isai/shared-types';

export const groupFundMovementsKey = (groupId: string) => ['groups', 'detail', groupId, 'fund-movements'] as const;

// Mismo criterio que useGroupFundBalanceQuery — ver ahí el comentario.
export function useGroupFundMovementsQuery(groupId: string, enabled: boolean = true) {
  return useQuery({
    queryKey: groupFundMovementsKey(groupId),
    queryFn: async () => {
      const { data } = await apiClient.get<GroupFundMovement[]>(`/groups/${groupId}/fund-movements`);
      return data;
    },
    enabled: !!groupId && enabled,
  });
}
