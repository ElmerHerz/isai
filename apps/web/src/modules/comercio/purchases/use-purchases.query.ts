import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { Purchase } from '@isai/shared-types';

export const purchasesQueryKey = (institutionId: string) => ['purchases', institutionId] as const;

export function usePurchasesQuery(institutionId: string) {
  return useQuery({
    queryKey: purchasesQueryKey(institutionId),
    queryFn: async () => {
      const { data } = await apiClient.get<Purchase[]>('/purchases', { params: { institutionId } });
      return data;
    },
    enabled: !!institutionId,
  });
}
