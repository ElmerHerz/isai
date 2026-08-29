import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { toast } from '@/lib/toast';
import type { Budget } from '@isai/shared-types';
import { budgetsQueryKey } from './use-budgets.query';
import { budgetDetailKey } from './use-budget.query';

export interface UpdateBudgetInput {
  name?: string;
  periodStart?: string;
  periodEnd?: string;
  notes?: string;
  status?: 'draft' | 'active' | 'closed';
}

export function useUpdateBudgetMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, dto }: { id: string; dto: UpdateBudgetInput }) => {
      const { data } = await apiClient.patch<Budget>(`/budgets/${id}`, dto);
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: budgetsQueryKey(data.institutionId) });
      queryClient.invalidateQueries({ queryKey: budgetDetailKey(data.id) });
      toast.success('Presupuesto actualizado.');
    },
  });
}
