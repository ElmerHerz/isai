import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { Sale } from '@isai/shared-types';

export const salesQueryKey = (institutionId: string) => ['sales', institutionId] as const;

export function useSalesQuery(institutionId: string) {
  return useQuery({
    queryKey: salesQueryKey(institutionId),
    queryFn: async () => {
      const { data } = await apiClient.get<Sale[]>('/sales', { params: { institutionId } });
      return data;
    },
    enabled: !!institutionId,
  });
}
