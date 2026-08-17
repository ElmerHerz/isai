import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { toast } from '@/lib/toast';
import type { EventFundCollection } from '@isai/shared-types';
import { eventFundCollectionsKey } from './use-event-fund-collections.query';

export interface CreateEventFundCollectionInput {
  fundTypeId: string;
  amount: number;
  notes?: string;
}

export function useCreateEventFundCollectionMutation(eventId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (dto: CreateEventFundCollectionInput) => {
      const { data } = await apiClient.post<EventFundCollection>(`/events/${eventId}/fund-collections`, dto);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: eventFundCollectionsKey(eventId) });
      toast.success('Fondo registrado.');
    },
  });
}
