import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { Sale } from '@isai/shared-types';

export const saleDetailKey = (id: string) => ['sales', 'detail', id] as const;

export function useSaleQuery(id: string) {
  return useQuery({
    queryKey: saleDetailKey(id),
    queryFn: async () => {
      const { data } = await apiClient.get<Sale>(`/sales/${id}`);
      return data;
    },
    enabled: !!id,
  });
}
