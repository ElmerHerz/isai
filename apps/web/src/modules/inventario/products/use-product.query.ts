import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { Product } from '@isai/shared-types';

export const productDetailKey = (id: string) => ['products', 'detail', id] as const;

export function useProductQuery(id: string) {
  return useQuery({
    queryKey: productDetailKey(id),
    queryFn: async () => {
      const { data } = await apiClient.get<Product>(`/products/${id}`);
      return data;
    },
    enabled: !!id,
  });
}
