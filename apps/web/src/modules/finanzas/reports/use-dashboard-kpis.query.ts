import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { DashboardKpis } from '@isai/shared-types';

export const dashboardKpisQueryKey = ['dashboard-kpis'] as const;

export function useDashboardKpisQuery() {
  return useQuery({
    queryKey: dashboardKpisQueryKey,
    queryFn: async () => {
      const { data } = await apiClient.get<DashboardKpis>('/reports/dashboard-kpis');
      return data;
    },
  });
}
