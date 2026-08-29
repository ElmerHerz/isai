import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { toast } from '@/lib/toast';
import { groupFundBalanceKey } from './use-group-fund-balance.query';
import { groupFundMovementsKey } from './use-group-fund-movements.query';

export function usePostGroupFundExpenseToLedgerMutation(groupId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (expenseId: string) => {
      const { data } = await apiClient.post(`/groups/${groupId}/fund-expenses/${expenseId}/post-to-ledger`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: groupFundBalanceKey(groupId) });
      queryClient.invalidateQueries({ queryKey: groupFundMovementsKey(groupId) });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['journal-entries'] });
      toast.success('Gasto contabilizado.');
    },
  });
}
