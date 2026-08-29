import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { toast, getErrorMessage } from '@/lib/toast';
import type { Product } from '@isai/shared-types';
import { productsQueryKey } from './use-products.query';
import { productDetailKey } from './use-product.query';

export function useRemoveProductUnitMutation(productId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (unitId: string) => {
      const { data } = await apiClient.delete<Product>(`/products/${productId}/units/${unitId}`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: productsQueryKey });
      queryClient.invalidateQueries({ queryKey: productDetailKey(productId) });
      toast.success('Presentación eliminada.');
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'No se pudo eliminar la presentación.'));
    },
  });
}
