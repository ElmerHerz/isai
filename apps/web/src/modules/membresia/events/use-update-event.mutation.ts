import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { toast } from '@/lib/toast';
import type { EventWithRelations } from '@isai/shared-types';
import { eventsQueryKey } from './use-events.query';
import { eventDetailKey } from './use-event.query';
import type { CreateEventInput } from './use-create-event.mutation';

export type UpdateEventInput = Partial<CreateEventInput>;

export function useUpdateEventMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, dto }: { id: string; dto: UpdateEventInput }) => {
      const { data } = await apiClient.patch<EventWithRelations>(`/events/${id}`, dto);
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: eventsQueryKey(data.institutionId) });
      queryClient.invalidateQueries({ queryKey: eventDetailKey(data.id) });
      toast.success('Evento actualizado.');
    },
  });
}
