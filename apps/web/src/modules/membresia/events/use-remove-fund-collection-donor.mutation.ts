import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { toast } from '@/lib/toast';
import { fundCollectionDonorsKey } from './use-fund-collection-donors.query';

export function useRemoveFundCollectionDonorMutation(eventId: string, collectionId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (donorId: string) => {
      await apiClient.delete(`/events/${eventId}/fund-collections/${collectionId}/donors/${donorId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: fundCollectionDonorsKey(eventId, collectionId) });
      toast.success('Donante quitado.');
    },
  });
}
