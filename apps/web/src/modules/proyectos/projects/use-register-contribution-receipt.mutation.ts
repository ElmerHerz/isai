import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { toast } from '@/lib/toast';
import { projectContributionsKey } from './use-project-contributions.query';

export function useRegisterContributionReceiptMutation(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (contributionId: string) => {
      const { data } = await apiClient.post<{ documentNumber: string }>(
        `/projects/${projectId}/contributions/${contributionId}/receipt`,
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectContributionsKey(projectId) });
      toast.success('Comprobante generado.');
    },
  });
}
