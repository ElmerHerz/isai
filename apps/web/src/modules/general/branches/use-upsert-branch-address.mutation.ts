import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { toast } from '@/lib/toast';
import type { Address } from '@isai/shared-types';
import { branchAddressQueryKey } from './use-branch-address.query';

export interface UpsertBranchAddressInput {
  countryCode: string;
  stateProvince?: string;
  city: string;
  line1: string;
  line2?: string;
  postalCode?: string;
  latitude?: number;
  longitude?: number;
}

export function useUpsertBranchAddressMutation(branchId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (dto: UpsertBranchAddressInput) => {
      const { data } = await apiClient.put<Address>(`/branches/${branchId}/address`, dto);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: branchAddressQueryKey(branchId) });
      toast.success('Ubicación guardada.');
    },
  });
}
