import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { EventFundCollectionDonor } from '@isai/shared-types';

export const fundCollectionDonorsKey = (eventId: string, collectionId: string) =>
  ['events', 'detail', eventId, 'fund-collections', collectionId, 'donors'] as const;

export function useFundCollectionDonorsQuery(eventId: string, collectionId: string, enabled: boolean = true) {
  return useQuery({
    queryKey: fundCollectionDonorsKey(eventId, collectionId),
    queryFn: async () => {
      const { data } = await apiClient.get<EventFundCollectionDonor[]>(
        `/events/${eventId}/fund-collections/${collectionId}/donors`,
      );
      return data;
    },
    enabled: !!eventId && !!collectionId && enabled,
  });
}
