import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { toast } from '@/lib/toast';
import { groupFundMovementsKey } from './use-group-fund-movements.query';

export function useRejectGroupFundExpenseMutation(groupId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ expenseId, reason }: { expenseId: string; reason: string }) => {
      const { data } = await apiClient.post(`/groups/${groupId}/fund-expenses/${expenseId}/reject`, { reason });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: groupFundMovementsKey(groupId) });
      toast.success('Gasto rechazado.');
    },
  });
}
