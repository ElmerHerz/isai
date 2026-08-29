import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { Budget } from '@isai/shared-types';

export const budgetsQueryKey = (institutionId: string) => ['budgets', institutionId] as const;

export function useBudgetsQuery(institutionId: string) {
  return useQuery({
    queryKey: budgetsQueryKey(institutionId),
    queryFn: async () => {
      const { data } = await apiClient.get<Budget[]>('/budgets', { params: { institutionId } });
      return data;
    },
    enabled: !!institutionId,
  });
}
