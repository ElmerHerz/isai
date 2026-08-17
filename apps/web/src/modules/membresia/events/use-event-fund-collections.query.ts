import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { EventFundCollection } from '@isai/shared-types';

export const eventFundCollectionsKey = (id: string) => ['events', 'detail', id, 'fund-collections'] as const;

export function useEventFundCollectionsQuery(id: string) {
  return useQuery({
    queryKey: eventFundCollectionsKey(id),
    queryFn: async () => {
      const { data } = await apiClient.get<EventFundCollection[]>(`/events/${id}/fund-collections`);
      return data;
    },
    enabled: !!id,
  });
}
