import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { IncomeStatement } from '@isai/shared-types';

export const incomeStatementQueryKey = (startDate?: string, endDate?: string) =>
  ['income-statement', startDate ?? null, endDate ?? null] as const;

export function useIncomeStatementQuery(startDate?: string, endDate?: string) {
  return useQuery({
    queryKey: incomeStatementQueryKey(startDate, endDate),
    queryFn: async () => {
      const { data } = await apiClient.get<IncomeStatement>('/reports/income-statement', {
        params: { startDate, endDate },
      });
      return data;
    },
  });
}
