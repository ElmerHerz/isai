import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { Address } from '@isai/shared-types';

export const branchAddressQueryKey = (branchId: string) => ['branches', branchId, 'address'] as const;

export function useBranchAddressQuery(branchId: string) {
  return useQuery({
    queryKey: branchAddressQueryKey(branchId),
    queryFn: async () => {
      const { data } = await apiClient.get<Address | null>(`/branches/${branchId}/address`);
      return data;
    },
    enabled: !!branchId,
  });
}
