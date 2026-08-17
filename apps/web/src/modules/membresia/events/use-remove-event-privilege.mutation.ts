import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { toast } from '@/lib/toast';
import { eventPrivilegesKey } from './use-event-privileges.query';

export function useRemoveEventPrivilegeMutation(eventId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (privilegeId: string) => {
      await apiClient.delete(`/events/${eventId}/privileges/${privilegeId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: eventPrivilegesKey(eventId) });
      toast.success('Privilegio eliminado.');
    },
  });
}
