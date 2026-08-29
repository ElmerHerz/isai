import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { toast, getErrorMessage } from '@/lib/toast';
import type { Product } from '@isai/shared-types';
import { productsQueryKey } from './use-products.query';
import { productDetailKey } from './use-product.query';

export interface UpdateProductInput {
  // string | null (no solo string | undefined a propósito): Prisma trata
  // `undefined` como "no tocar" y `null` como "limpiar" — para poder borrar
  // un SKU/categoría/etc. ya guardado hay que poder mandar null explícito.
  sku?: string | null;
  barcode?: string | null;
  name?: string;
  description?: string | null;
  categoryId?: string | null;
  unitCode?: string;
  salePrice?: number | null;
  tracksInventory?: boolean;
  isActive?: boolean;
}

export function useUpdateProductMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, dto }: { id: string; dto: UpdateProductInput }) => {
      const { data } = await apiClient.patch<Product>(`/products/${id}`, dto);
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: productsQueryKey });
      queryClient.invalidateQueries({ queryKey: productDetailKey(data.id) });
      toast.success('Producto actualizado.');
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'No se pudo actualizar el producto.'));
    },
  });
}
