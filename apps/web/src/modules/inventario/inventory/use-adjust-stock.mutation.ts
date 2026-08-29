import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { toast, getErrorMessage } from '@/lib/toast';
import type { ProductStock } from '@isai/shared-types';
import { productStockQueryKey } from './use-product-stock.query';
import { productMovementsQueryKey } from './use-product-movements.query';
import { productsQueryKey } from '../products/use-products.query';
import { productDetailKey } from '../products/use-product.query';

export interface AdjustStockInput {
  branchId: string;
  quantityDelta: number;
  unitCost?: number;
  notes: string;
}

export function useAdjustStockMutation(productId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (dto: AdjustStockInput) => {
      const { data } = await apiClient.post<ProductStock[]>(`/products/${productId}/adjust-stock`, dto);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: productStockQueryKey(productId) });
      queryClient.invalidateQueries({ queryKey: productMovementsQueryKey(productId) });
      queryClient.invalidateQueries({ queryKey: productsQueryKey });
      queryClient.invalidateQueries({ queryKey: productDetailKey(productId) });
      toast.success('Existencia ajustada.');
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'No se pudo ajustar la existencia.'));
    },
  });
}
