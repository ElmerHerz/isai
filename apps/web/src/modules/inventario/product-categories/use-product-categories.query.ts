import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { ProductCategory } from '@isai/shared-types';

export const productCategoriesQueryKey = ['product-categories'] as const;

export function useProductCategoriesQuery() {
  return useQuery({
    queryKey: productCategoriesQueryKey,
    queryFn: async () => {
      const { data } = await apiClient.get<ProductCategory[]>('/product-categories');
      return data;
    },
  });
}
