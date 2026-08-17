import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { toast } from '@/lib/toast';
import type { Branch } from '@isai/shared-types';
import { branchesQueryKey } from './use-branches.query';
import { ALL_BRANCHES_QUERY_KEY } from './use-all-branches.query';

export interface UpdateBranchInput {
  name?: string;
  isActive?: boolean;
}

export function useUpdateBranchMutation(institutionId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, dto }: { id: string; dto: UpdateBranchInput }) => {
      const { data } = await apiClient.patch<Branch>(
        `/institutions/${institutionId}/branches/${id}`,
        dto,
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: branchesQueryKey(institutionId) });
      queryClient.invalidateQueries({ queryKey: ALL_BRANCHES_QUERY_KEY });
      toast.success('Sucursal actualizada.');
    },
  });
}
