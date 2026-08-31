import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { ProductMarginRow } from '@isai/shared-types';

export const productMarginQueryKey = (institutionId: string, startDate: string, endDate: string) =>
  ['store-reports', 'product-margin', institutionId, startDate, endDate] as const;

export function useProductMarginQuery(institutionId: string, startDate: string, endDate: string) {
  return useQuery({
    queryKey: productMarginQueryKey(institutionId, startDate, endDate),
    queryFn: async () => {
      const { data } = await apiClient.get<ProductMarginRow[]>('/store-reports/product-margin', {
        params: { institutionId, startDate, endDate },
      });
      return data;
    },
    enabled: !!institutionId,
  });
}
