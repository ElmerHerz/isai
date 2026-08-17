import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { toast } from '@/lib/toast';
import type { CatalogItem } from '@isai/shared-types';
import { catalogItemsQueryKey } from './use-catalog-items.query';

export interface CreateCatalogItemInput {
  catalogCode: string;
  code: string;
  name: string;
  sortOrder?: number;
  isActive?: boolean;
}

export function useCreateCatalogItemMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (dto: CreateCatalogItemInput) => {
      const { data } = await apiClient.post<CatalogItem>('/catalog-items', dto);
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: catalogItemsQueryKey(data.catalogCode) });
      toast.success('Ítem de catálogo creado.');
    },
  });
}
