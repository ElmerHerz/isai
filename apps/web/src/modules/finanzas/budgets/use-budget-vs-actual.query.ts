import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { BudgetVsActualRow } from '@isai/shared-types';

export const budgetVsActualKey = (budgetId: string, month: string) => ['budget-vs-actual', budgetId, month] as const;

export function useBudgetVsActualQuery(budgetId: string, month: string) {
  return useQuery({
    queryKey: budgetVsActualKey(budgetId, month),
    queryFn: async () => {
      const { data } = await apiClient.get<BudgetVsActualRow[]>('/reports/budget-vs-actual', {
        params: { budgetId, month },
      });
      return data;
    },
    enabled: !!budgetId && !!month,
  });
}
