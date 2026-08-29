import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { ProductStock } from '@isai/shared-types';

export const productStockQueryKey = (productId: string) => ['product-stock', productId] as const;

export function useProductStockQuery(productId: string) {
  return useQuery({
    queryKey: productStockQueryKey(productId),
    queryFn: async () => {
      const { data } = await apiClient.get<ProductStock[]>(`/products/${productId}/stock`);
      return data;
    },
    enabled: !!productId,
  });
}
