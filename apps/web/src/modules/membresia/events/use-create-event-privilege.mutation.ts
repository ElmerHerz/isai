import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { toast } from '@/lib/toast';
import type { EventPrivilege } from '@isai/shared-types';
import { eventPrivilegesKey } from './use-event-privileges.query';

export interface CreateEventPrivilegeInput {
  personId: string;
  privilegeTypeId: string;
  notes?: string;
}

export function useCreateEventPrivilegeMutation(eventId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (dto: CreateEventPrivilegeInput) => {
      const { data } = await apiClient.post<EventPrivilege>(`/events/${eventId}/privileges`, dto);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: eventPrivilegesKey(eventId) });
      toast.success('Privilegio asignado.');
    },
  });
}
