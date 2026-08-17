import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { PersonGroupMembership } from '@isai/shared-types';

export const personGroupsKey = (id: string) => ['persons', 'detail', id, 'groups'] as const;

export function usePersonGroupsQuery(id: string) {
  return useQuery({
    queryKey: personGroupsKey(id),
    queryFn: async () => {
      const { data } = await apiClient.get<PersonGroupMembership[]>(`/persons/${id}/groups`);
      return data;
    },
    enabled: !!id,
  });
}
