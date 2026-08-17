import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { toast } from '@/lib/toast';
import { branchSchedulesQueryKey } from './use-branch-schedules.query';

export function useDeleteBranchScheduleMutation(branchId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/branches/${branchId}/schedules/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: branchSchedulesQueryKey(branchId) });
      toast.success('Franja de horario eliminada.');
    },
  });
}
