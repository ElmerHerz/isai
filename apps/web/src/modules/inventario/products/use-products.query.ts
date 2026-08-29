import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { Product } from '@isai/shared-types';

export const productsQueryKey = ['products'] as const;

export function useProductsQuery() {
  return useQuery({
    queryKey: productsQueryKey,
    queryFn: async () => {
      const { data } = await apiClient.get<Product[]>('/products');
      return data;
    },
  });
}
