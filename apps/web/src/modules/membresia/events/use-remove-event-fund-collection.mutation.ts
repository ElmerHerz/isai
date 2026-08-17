import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { toast } from '@/lib/toast';
import { eventFundCollectionsKey } from './use-event-fund-collections.query';

export function useRemoveEventFundCollectionMutation(eventId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (collectionId: string) => {
      await apiClient.delete(`/events/${eventId}/fund-collections/${collectionId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: eventFundCollectionsKey(eventId) });
      toast.success('Registro de fondo eliminado.');
    },
  });
}
