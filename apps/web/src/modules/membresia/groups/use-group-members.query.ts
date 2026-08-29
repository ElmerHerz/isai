import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { GroupMemberWithPerson } from '@isai/shared-types';

export const groupMembersQueryKey = (groupId: string) => ['groups', groupId, 'members'] as const;

// enabled adicional (default true) — mismo criterio que useGroupsQuery
// (membership.group.view).
export function useGroupMembersQuery(groupId: string, enabled: boolean = true) {
  return useQuery({
    queryKey: groupMembersQueryKey(groupId),
    queryFn: async () => {
      const { data } = await apiClient.get<GroupMemberWithPerson[]>(`/groups/${groupId}/members`);
      return data;
    },
    enabled: !!groupId && enabled,
  });
}
