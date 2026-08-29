import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { ProjectPledge } from '@isai/shared-types';

export const projectPledgesKey = (id: string) => ['projects', 'detail', id, 'pledges'] as const;

export function useProjectPledgesQuery(id: string) {
  return useQuery({
    queryKey: projectPledgesKey(id),
    queryFn: async () => {
      const { data } = await apiClient.get<ProjectPledge[]>(`/projects/${id}/pledges`);
      return data;
    },
    enabled: !!id,
  });
}
