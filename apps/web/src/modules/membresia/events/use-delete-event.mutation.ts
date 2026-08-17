import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { toast } from '@/lib/toast';
import { eventsQueryKey } from './use-events.query';

export function useDeleteEventMutation(institutionId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (eventId: string) => {
      await apiClient.delete(`/events/${eventId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: eventsQueryKey(institutionId) });
      toast.success('Evento eliminado.');
    },
  });
}
