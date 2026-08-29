import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { Asset } from '@isai/shared-types';

export const assetDetailKey = (id: string) => ['assets', 'detail', id] as const;

export function useAssetQuery(id: string) {
  return useQuery({
    queryKey: assetDetailKey(id),
    queryFn: async () => {
      const { data } = await apiClient.get<Asset>(`/assets/${id}`);
      return data;
    },
    enabled: !!id,
  });
}
