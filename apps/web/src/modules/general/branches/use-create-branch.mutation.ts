import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { toast } from '@/lib/toast';
import type { Branch } from '@isai/shared-types';
import { branchesQueryKey } from './use-branches.query';
import { ALL_BRANCHES_QUERY_KEY } from './use-all-branches.query';

export interface CreateBranchInput {
  name: string;
}

export function useCreateBranchMutation(institutionId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (dto: CreateBranchInput) => {
      const { data } = await apiClient.post<Branch>(
        `/institutions/${institutionId}/branches`,
        dto,
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: branchesQueryKey(institutionId) });
      // También refresca el conteo de sucursales que se ve en la lista de instituciones.
      queryClient.invalidateQueries({ queryKey: ['institutions'] });
      queryClient.invalidateQueries({ queryKey: ALL_BRANCHES_QUERY_KEY });
      toast.success('Sucursal creada.');
    },
  });
}
