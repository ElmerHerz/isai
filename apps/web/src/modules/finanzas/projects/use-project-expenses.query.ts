import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { ProjectExpense } from '@isai/shared-types';

export const projectExpensesKey = (id: string) => ['projects', 'detail', id, 'expenses'] as const;

export function useProjectExpensesQuery(id: string) {
  return useQuery({
    queryKey: projectExpensesKey(id),
    queryFn: async () => {
      const { data } = await apiClient.get<ProjectExpense[]>(`/projects/${id}/expenses`);
      return data;
    },
    enabled: !!id,
  });
}
