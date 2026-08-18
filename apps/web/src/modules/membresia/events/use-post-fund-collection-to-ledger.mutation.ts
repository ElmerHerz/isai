import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { toast } from '@/lib/toast';
import type { EventFundCollection } from '@isai/shared-types';
import { eventFundCollectionsKey } from './use-event-fund-collections.query';

export function usePostFundCollectionToLedgerMutation(eventId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (collectionId: string) => {
      const { data } = await apiClient.post<EventFundCollection>(
        `/events/${eventId}/fund-collections/${collectionId}/post-to-ledger`,
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: eventFundCollectionsKey(eventId) });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['journal-entries'] });
      toast.success('Colecta contabilizada.');
    },
  });
}
