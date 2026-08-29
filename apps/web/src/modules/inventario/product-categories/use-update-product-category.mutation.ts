import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { toast, getErrorMessage } from '@/lib/toast';
import type { ProductCategory } from '@isai/shared-types';
import { productCategoriesQueryKey } from './use-product-categories.query';

export interface UpdateProductCategoryInput {
  name?: string;
  isActive?: boolean;
}

export function useUpdateProductCategoryMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, dto }: { id: string; dto: UpdateProductCategoryInput }) => {
      const { data } = await apiClient.patch<ProductCategory>(`/product-categories/${id}`, dto);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: productCategoriesQueryKey });
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'No se pudo actualizar la categoría.'));
    },
  });
}
