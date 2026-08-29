import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { toast } from '@/lib/toast';
import { projectPledgesKey } from './use-project-pledges.query';

export function useRemoveProjectPledgeMutation(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (pledgeId: string) => {
      await apiClient.delete(`/projects/${projectId}/pledges/${pledgeId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectPledgesKey(projectId) });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast.success('Compromiso eliminado.');
    },
  });
}
