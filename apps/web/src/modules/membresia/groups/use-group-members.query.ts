import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { GroupMemberWithPerson } from '@isai/shared-types';

export const groupMembersQueryKey = (groupId: string) => ['groups', groupId, 'members'] as const;

export function useGroupMembersQuery(groupId: string) {
  return useQuery({
    queryKey: groupMembersQueryKey(groupId),
    queryFn: async () => {
      const { data } = await apiClient.get<GroupMemberWithPerson[]>(`/groups/${groupId}/members`);
      return data;
    },
    enabled: !!groupId,
  });
}
