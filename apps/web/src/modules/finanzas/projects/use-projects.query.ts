import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { Project } from '@isai/shared-types';

export const projectsQueryKey = (institutionId: string) => ['projects', institutionId] as const;

export function useProjectsQuery(institutionId: string) {
  return useQuery({
    queryKey: projectsQueryKey(institutionId),
    queryFn: async () => {
      const { data } = await apiClient.get<Project[]>('/projects', { params: { institutionId } });
      return data;
    },
    enabled: !!institutionId,
  });
}
