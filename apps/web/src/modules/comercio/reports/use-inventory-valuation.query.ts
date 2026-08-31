import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { InventoryValuationRow } from '@isai/shared-types';

export const inventoryValuationQueryKey = (institutionId: string) => ['store-reports', 'inventory-valuation', institutionId] as const;

export function useInventoryValuationQuery(institutionId: string) {
  return useQuery({
    queryKey: inventoryValuationQueryKey(institutionId),
    queryFn: async () => {
      const { data } = await apiClient.get<InventoryValuationRow[]>('/store-reports/inventory-valuation', {
        params: { institutionId },
      });
      return data;
    },
    enabled: !!institutionId,
  });
}
