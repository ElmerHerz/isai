import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { EventWithRelations } from '@isai/shared-types';

export const eventsQueryKey = (institutionId: string) => ['events', institutionId] as const;

export function useEventsQuery(institutionId: string) {
  return useQuery({
    queryKey: eventsQueryKey(institutionId),
    queryFn: async () => {
      const { data } = await apiClient.get<EventWithRelations[]>('/events', {
        params: { institutionId },
      });
      return data;
    },
    enabled: !!institutionId,
  });
}
