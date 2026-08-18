import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { toast } from '@/lib/toast';
import type { ProjectExpense } from '@isai/shared-types';
import { projectExpensesKey } from './use-project-expenses.query';

export interface CreateProjectExpenseInput {
  accountId: string;
  amount: number;
  incurredAt: string;
  notes?: string;
}

export function useCreateProjectExpenseMutation(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (dto: CreateProjectExpenseInput) => {
      const { data } = await apiClient.post<ProjectExpense>(`/projects/${projectId}/expenses`, dto);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectExpensesKey(projectId) });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast.success('Gasto registrado.');
    },
  });
}
