import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { toast } from '@/lib/toast';
import { projectContributionsKey } from './use-project-contributions.query';

export function useRemoveProjectContributionMutation(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (contributionId: string) => {
      await apiClient.delete(`/projects/${projectId}/contributions/${contributionId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectContributionsKey(projectId) });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast.success('Aporte eliminado.');
    },
  });
}
