import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { toast } from '@/lib/toast';
import type { ProjectContribution } from '@isai/shared-types';
import { projectContributionsKey } from './use-project-contributions.query';

export interface CreateProjectContributionInput {
  personId?: string;
  groupId?: string;
  amount: number;
  contributedAt: string;
  notes?: string;
}

export function useCreateProjectContributionMutation(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (dto: CreateProjectContributionInput) => {
      const { data } = await apiClient.post<ProjectContribution>(`/projects/${projectId}/contributions`, dto);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectContributionsKey(projectId) });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast.success('Aporte registrado.');
    },
  });
}
