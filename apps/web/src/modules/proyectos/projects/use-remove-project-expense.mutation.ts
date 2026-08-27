import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { toast } from '@/lib/toast';
import { projectExpensesKey } from './use-project-expenses.query';

export function useRemoveProjectExpenseMutation(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (expenseId: string) => {
      await apiClient.delete(`/projects/${projectId}/expenses/${expenseId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectExpensesKey(projectId) });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast.success('Gasto eliminado.');
    },
  });
}
