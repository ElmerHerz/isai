import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { toast, getErrorMessage } from '@/lib/toast';
import type { ProductStock } from '@isai/shared-types';
import { productStockQueryKey } from './use-product-stock.query';
import { productMovementsQueryKey } from './use-product-movements.query';
import { productsQueryKey } from '../products/use-products.query';
import { productDetailKey } from '../products/use-product.query';

export interface ConsumeStockInput {
  branchId: string;
  quantity: number;
  expenseAccountId: string;
  notes: string;
}

export function useConsumeStockMutation(productId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (dto: ConsumeStockInput) => {
      const { data } = await apiClient.post<ProductStock[]>(`/products/${productId}/consume`, dto);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: productStockQueryKey(productId) });
      queryClient.invalidateQueries({ queryKey: productMovementsQueryKey(productId) });
      queryClient.invalidateQueries({ queryKey: productsQueryKey });
      queryClient.invalidateQueries({ queryKey: productDetailKey(productId) });
      toast.success('Uso interno registrado.');
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'No se pudo registrar el uso interno.'));
    },
  });
}
