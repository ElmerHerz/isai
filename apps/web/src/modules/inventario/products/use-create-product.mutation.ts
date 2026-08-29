import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { toast, getErrorMessage } from '@/lib/toast';
import type { Product } from '@isai/shared-types';
import { productsQueryKey } from './use-products.query';

export interface CreateProductInput {
  sku?: string;
  barcode?: string;
  name: string;
  description?: string;
  categoryId?: string;
  unitCode: string;
  salePrice?: number;
  tracksInventory?: boolean;
}

export function useCreateProductMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (dto: CreateProductInput) => {
      const { data } = await apiClient.post<Product>('/products', dto);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: productsQueryKey });
      toast.success('Producto creado.');
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'No se pudo crear el producto.'));
    },
  });
}
