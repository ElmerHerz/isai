import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { FundSummaryRow } from '@isai/shared-types';

export const fundSummaryQueryKey = (tenantId?: string) => ['fund-summary', tenantId ?? null] as const;

export function useFundSummaryQuery(tenantId?: string) {
  return useQuery({
    queryKey: fundSummaryQueryKey(tenantId),
    queryFn: async () => {
      const { data } = await apiClient.get<FundSummaryRow[]>('/reports/fund-summary', {
        params: tenantId ? { tenantId } : undefined,
      });
      return data;
    },
  });
}
