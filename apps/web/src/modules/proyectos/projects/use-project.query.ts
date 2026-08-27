import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { Project } from '@isai/shared-types';

export const projectDetailKey = (id: string) => ['projects', 'detail', id] as const;

export function useProjectQuery(id: string) {
  return useQuery({
    queryKey: projectDetailKey(id),
    queryFn: async () => {
      const { data } = await apiClient.get<Project>(`/projects/${id}`);
      return data;
    },
    enabled: !!id,
  });
}
