import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { Budget } from '@isai/shared-types';

export const budgetDetailKey = (id: string) => ['budgets', 'detail', id] as const;

export function useBudgetQuery(id: string) {
  return useQuery({
    queryKey: budgetDetailKey(id),
    queryFn: async () => {
      const { data } = await apiClient.get<Budget>(`/budgets/${id}`);
      return data;
    },
    enabled: !!id,
  });
}
