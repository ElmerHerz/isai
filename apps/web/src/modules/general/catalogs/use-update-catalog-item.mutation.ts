import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { toast } from '@/lib/toast';
import type { CatalogItem } from '@isai/shared-types';
import { catalogItemsQueryKey } from './use-catalog-items.query';

export interface UpdateCatalogItemInput {
  name?: string;
  sortOrder?: number;
  isActive?: boolean;
}

export function useUpdateCatalogItemMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, dto }: { id: string; dto: UpdateCatalogItemInput }) => {
      const { data } = await apiClient.patch<CatalogItem>(`/catalog-items/${id}`, dto);
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: catalogItemsQueryKey(data.catalogCode) });
      toast.success('Ítem de catálogo actualizado.');
    },
  });
}
