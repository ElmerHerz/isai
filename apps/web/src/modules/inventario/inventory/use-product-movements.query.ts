import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { InventoryMovement } from '@isai/shared-types';

export const productMovementsQueryKey = (productId: string) => ['product-movements', productId] as const;

export function useProductMovementsQuery(productId: string) {
  return useQuery({
    queryKey: productMovementsQueryKey(productId),
    queryFn: async () => {
      const { data } = await apiClient.get<InventoryMovement[]>(`/products/${productId}/movements`);
      return data;
    },
    enabled: !!productId,
  });
}
