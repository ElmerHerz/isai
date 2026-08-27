import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { toast } from '@/lib/toast';
import type { ProjectContribution } from '@isai/shared-types';
import { projectContributionsKey } from './use-project-contributions.query';

export function usePostProjectContributionToLedgerMutation(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (contributionId: string) => {
      const { data } = await apiClient.post<ProjectContribution>(
        `/projects/${projectId}/contributions/${contributionId}/post-to-ledger`,
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectContributionsKey(projectId) });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['journal-entries'] });
      toast.success('Aporte contabilizado.');
    },
  });
}
