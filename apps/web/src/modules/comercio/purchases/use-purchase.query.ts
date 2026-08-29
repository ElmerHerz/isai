import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { Purchase } from '@isai/shared-types';

export const purchaseDetailKey = (id: string) => ['purchases', 'detail', id] as const;

export function usePurchaseQuery(id: string) {
  return useQuery({
    queryKey: purchaseDetailKey(id),
    queryFn: async () => {
      const { data } = await apiClient.get<Purchase>(`/purchases/${id}`);
      return data;
    },
    enabled: !!id,
  });
}
