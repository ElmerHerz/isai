import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { ProjectContribution } from '@isai/shared-types';

export const projectContributionsKey = (id: string) => ['projects', 'detail', id, 'contributions'] as const;

export function useProjectContributionsQuery(id: string) {
  return useQuery({
    queryKey: projectContributionsKey(id),
    queryFn: async () => {
      const { data } = await apiClient.get<ProjectContribution[]>(`/projects/${id}/contributions`);
      return data;
    },
    enabled: !!id,
  });
}
