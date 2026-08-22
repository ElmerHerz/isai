import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { MonthlyTrendRow } from '@isai/shared-types';

export const monthlyTrendQueryKey = ['monthly-trend'] as const;

export function useMonthlyTrendQuery() {
  return useQuery({
    queryKey: monthlyTrendQueryKey,
    queryFn: async () => {
      const { data } = await apiClient.get<MonthlyTrendRow[]>('/reports/monthly-trend');
      return data;
    },
  });
}
