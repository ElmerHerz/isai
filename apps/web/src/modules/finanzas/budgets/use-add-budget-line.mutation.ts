import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { toast } from '@/lib/toast';
import type { Budget } from '@isai/shared-types';
import { budgetDetailKey } from './use-budget.query';

export interface AddBudgetLineInput {
  accountId: string;
  monthlyAmount: number;
  notes?: string;
}

export function useAddBudgetLineMutation(budgetId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (dto: AddBudgetLineInput) => {
      const { data } = await apiClient.post<Budget>(`/budgets/${budgetId}/lines`, dto);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: budgetDetailKey(budgetId) });
      toast.success('Línea agregada.');
    },
  });
}
