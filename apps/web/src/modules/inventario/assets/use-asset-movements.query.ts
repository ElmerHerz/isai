import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { AssetMovement } from '@isai/shared-types';

export const assetMovementsQueryKey = (assetId: string) => ['asset-movements', assetId] as const;

export function useAssetMovementsQuery(assetId: string) {
  return useQuery({
    queryKey: assetMovementsQueryKey(assetId),
    queryFn: async () => {
      const { data } = await apiClient.get<AssetMovement[]>(`/assets/${assetId}/movements`);
      return data;
    },
    enabled: !!assetId,
  });
}
