import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { toast } from '@/lib/toast';
import { groupFundBalanceKey } from './use-group-fund-balance.query';
import { groupFundMovementsKey } from './use-group-fund-movements.query';

export function useRemoveGroupFundExpenseMutation(groupId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (expenseId: string) => {
      await apiClient.delete(`/groups/${groupId}/fund-expenses/${expenseId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: groupFundBalanceKey(groupId) });
      queryClient.invalidateQueries({ queryKey: groupFundMovementsKey(groupId) });
      toast.success('Gasto eliminado.');
    },
  });
}
