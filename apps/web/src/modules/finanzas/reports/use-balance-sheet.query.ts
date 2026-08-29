import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { BalanceSheet } from '@isai/shared-types';

export const balanceSheetQueryKey = (asOfDate?: string) => ['balance-sheet', asOfDate ?? null] as const;

export function useBalanceSheetQuery(asOfDate?: string) {
  return useQuery({
    queryKey: balanceSheetQueryKey(asOfDate),
    queryFn: async () => {
      const { data } = await apiClient.get<BalanceSheet>('/reports/balance-sheet', {
        params: { asOfDate },
      });
      return data;
    },
  });
}
