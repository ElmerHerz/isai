import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { toast } from '@/lib/toast';
import type { Branch } from '@isai/shared-types';
import { branchesQueryKey } from './use-branches.query';
import { ALL_BRANCHES_QUERY_KEY } from './use-all-branches.query';

// Variante de useUpdateBranchMutation que no ata institutionId al hook (se
// pasa por llamada) — para la tabla agregada de /general/branches, donde
// cada fila puede ser de una institución distinta.
export function useUpdateBranchStatusMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      institutionId,
      id,
      isActive,
    }: {
      institutionId: string;
      id: string;
      isActive: boolean;
    }) => {
      const { data } = await apiClient.patch<Branch>(
        `/institutions/${institutionId}/branches/${id}`,
        { isActive },
      );
      return data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: branchesQueryKey(variables.institutionId) });
      queryClient.invalidateQueries({ queryKey: ALL_BRANCHES_QUERY_KEY });
      toast.success(variables.isActive ? 'Sucursal activada.' : 'Sucursal desactivada.');
    },
  });
}
