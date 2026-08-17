import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { GroupWithRelations } from '@isai/shared-types';

export const groupDetailKey = (id: string) => ['groups', 'detail', id] as const;

export function useGroupQuery(id: string) {
  return useQuery({
    queryKey: groupDetailKey(id),
    queryFn: async () => {
      const { data } = await apiClient.get<GroupWithRelations>(`/groups/${id}`);
      return data;
    },
    enabled: !!id,
  });
}
