import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { toast } from '@/lib/toast';
import type { Budget } from '@isai/shared-types';
import { budgetsQueryKey } from './use-budgets.query';

export interface CreateBudgetInput {
  institutionId: string;
  branchId?: string;
  name: string;
  periodStart: string;
  periodEnd: string;
  notes?: string;
}

export function useCreateBudgetMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (dto: CreateBudgetInput) => {
      const { data } = await apiClient.post<Budget>('/budgets', dto);
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: budgetsQueryKey(data.institutionId) });
      toast.success('Presupuesto creado.');
    },
  });
}
