import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { toast } from '@/lib/toast';
import type { ProjectExpense } from '@isai/shared-types';
import { projectExpensesKey } from './use-project-expenses.query';

export function usePostProjectExpenseToLedgerMutation(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (expenseId: string) => {
      const { data } = await apiClient.post<ProjectExpense>(
        `/projects/${projectId}/expenses/${expenseId}/post-to-ledger`,
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectExpensesKey(projectId) });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['journal-entries'] });
      toast.success('Gasto contabilizado.');
    },
  });
}
