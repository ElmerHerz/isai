import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { Asset } from '@isai/shared-types';

export const assetsQueryKey = (institutionId: string) => ['assets', institutionId] as const;

export function useAssetsQuery(institutionId: string) {
  return useQuery({
    queryKey: assetsQueryKey(institutionId),
    queryFn: async () => {
      const { data } = await apiClient.get<Asset[]>('/assets', { params: { institutionId } });
      return data;
    },
    enabled: !!institutionId,
  });
}
