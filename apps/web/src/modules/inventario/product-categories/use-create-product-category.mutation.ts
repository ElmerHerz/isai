import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { toast, getErrorMessage } from '@/lib/toast';
import type { ProductCategory } from '@isai/shared-types';
import { productCategoriesQueryKey } from './use-product-categories.query';

export function useCreateProductCategoryMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (name: string) => {
      const { data } = await apiClient.post<ProductCategory>('/product-categories', { name });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: productCategoriesQueryKey });
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'No se pudo crear la categoría.'));
    },
  });
}
