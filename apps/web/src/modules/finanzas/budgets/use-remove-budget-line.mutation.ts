import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { toast } from '@/lib/toast';
import { budgetDetailKey } from './use-budget.query';

export function useRemoveBudgetLineMutation(budgetId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (lineId: string) => {
      await apiClient.delete(`/budgets/${budgetId}/lines/${lineId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: budgetDetailKey(budgetId) });
      toast.success('Línea eliminada.');
    },
  });
}
