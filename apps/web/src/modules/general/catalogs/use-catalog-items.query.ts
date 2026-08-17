import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { CatalogItem } from '@isai/shared-types';

export const catalogItemsQueryKey = (catalogCode: string) => ['catalog-items', catalogCode] as const;

export function useCatalogItemsQuery(catalogCode: string) {
  return useQuery({
    queryKey: catalogItemsQueryKey(catalogCode),
    queryFn: async () => {
      const { data } = await apiClient.get<CatalogItem[]>('/catalog-items', { params: { catalogCode } });
      return data;
    },
    enabled: !!catalogCode,
  });
}
