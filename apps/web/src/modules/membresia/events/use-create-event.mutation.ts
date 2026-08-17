import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { toast } from '@/lib/toast';
import type { EventWithRelations } from '@isai/shared-types';
import { eventsQueryKey } from './use-events.query';

export interface CreateEventInput {
  institutionId: string;
  branchId?: string;
  groupId?: string;
  scheduleId?: string;
  eventTypeId: string;
  title: string;
  eventDate: string;
  startTime?: string;
  endTime?: string;
  notes?: string;
}

export function useCreateEventMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (dto: CreateEventInput) => {
      const { data } = await apiClient.post<EventWithRelations>('/events', dto);
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: eventsQueryKey(data.institutionId) });
      toast.success('Evento creado.');
    },
  });
}
