import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { toast } from '@/lib/toast';
import type { EventFundCollectionDonor } from '@isai/shared-types';
import { fundCollectionDonorsKey } from './use-fund-collection-donors.query';

export interface AddFundCollectionDonorInput {
  personId: string;
  amount: number;
  paymentMethod?: 'cash' | 'transfer' | 'check';
  notes?: string;
}

export function useAddFundCollectionDonorMutation(eventId: string, collectionId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (dto: AddFundCollectionDonorInput) => {
      const { data } = await apiClient.post<EventFundCollectionDonor>(
        `/events/${eventId}/fund-collections/${collectionId}/donors`,
        dto,
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: fundCollectionDonorsKey(eventId, collectionId) });
      toast.success('Donante identificado.');
    },
  });
}
