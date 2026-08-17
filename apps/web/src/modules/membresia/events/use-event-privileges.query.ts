import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { EventPrivilege } from '@isai/shared-types';

export const eventPrivilegesKey = (id: string) => ['events', 'detail', id, 'privileges'] as const;

export function useEventPrivilegesQuery(id: string) {
  return useQuery({
    queryKey: eventPrivilegesKey(id),
    queryFn: async () => {
      const { data } = await apiClient.get<EventPrivilege[]>(`/events/${id}/privileges`);
      return data;
    },
    enabled: !!id,
  });
}
