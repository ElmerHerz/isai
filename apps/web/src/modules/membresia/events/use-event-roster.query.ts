import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { EventRosterEntry } from '@isai/shared-types';

export const eventRosterQueryKey = (eventId: string) => ['events', eventId, 'roster'] as const;

export function useEventRosterQuery(eventId: string) {
  return useQuery({
    queryKey: eventRosterQueryKey(eventId),
    queryFn: async () => {
      const { data } = await apiClient.get<EventRosterEntry[]>(`/events/${eventId}/roster`);
      return data;
    },
    enabled: !!eventId,
  });
}
