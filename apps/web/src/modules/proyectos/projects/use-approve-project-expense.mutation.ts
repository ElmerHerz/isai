import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { toast } from '@/lib/toast';
import type { ProjectExpense } from '@isai/shared-types';
import { projectExpensesKey } from './use-project-expenses.query';

export function useApproveProjectExpenseMutation(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (expenseId: string) => {
      const { data } = await apiClient.post<ProjectExpense>(`/projects/${projectId}/expenses/${expenseId}/approve`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectExpensesKey(projectId) });
      toast.success('Gasto aprobado.');
    },
  });
}
