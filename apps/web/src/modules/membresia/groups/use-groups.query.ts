import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { GroupListItem } from '@isai/shared-types';

export const groupsQueryKey = (institutionId: string) => ['groups', institutionId] as const;

// enabled adicional (default true) — quien llama debe apagarlo si sabe que
// el usuario actual no tiene membership.group.view (ej. un diálogo que se
// monta siempre, aunque cerrado, en una página que también visitan roles
// angostos), para no dispararle un 403 solo por abrir la página.
export function useGroupsQuery(institutionId: string, enabled: boolean = true) {
  return useQuery({
    queryKey: groupsQueryKey(institutionId),
    queryFn: async () => {
      const { data } = await apiClient.get<GroupListItem[]>('/groups', {
        params: { institutionId },
      });
      return data;
    },
    enabled: !!institutionId && enabled,
  });
}
