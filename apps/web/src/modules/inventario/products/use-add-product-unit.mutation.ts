import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { toast, getErrorMessage } from '@/lib/toast';
import type { Product } from '@isai/shared-types';
import { productsQueryKey } from './use-products.query';
import { productDetailKey } from './use-product.query';

export interface AddProductUnitInput {
  unitCode: string;
  conversionToBase: number;
  salePrice?: number;
}

export function useAddProductUnitMutation(productId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (dto: AddProductUnitInput) => {
      const { data } = await apiClient.post<Product>(`/products/${productId}/units`, dto);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: productsQueryKey });
      queryClient.invalidateQueries({ queryKey: productDetailKey(productId) });
      toast.success('Presentación agregada.');
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'No se pudo agregar la presentación.'));
    },
  });
}
