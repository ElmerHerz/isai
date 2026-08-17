import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { EventWithRelations } from '@isai/shared-types';

export const eventDetailKey = (id: string) => ['events', 'detail', id] as const;

export function useEventQuery(id: string) {
  return useQuery({
    queryKey: eventDetailKey(id),
    queryFn: async () => {
      const { data } = await apiClient.get<EventWithRelations>(`/events/${id}`);
      return data;
    },
    enabled: !!id,
  });
}
