import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { GroupListItem } from '@isai/shared-types';

export const groupsQueryKey = (institutionId: string) => ['groups', institutionId] as const;

export function useGroupsQuery(institutionId: string) {
  return useQuery({
    queryKey: groupsQueryKey(institutionId),
    queryFn: async () => {
      const { data } = await apiClient.get<GroupListItem[]>('/groups', {
        params: { institutionId },
      });
      return data;
    },
    enabled: !!institutionId,
  });
}
