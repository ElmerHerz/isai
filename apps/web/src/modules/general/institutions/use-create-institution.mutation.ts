import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { toast } from '@/lib/toast';
import type { Institution } from '@isai/shared-types';
import { INSTITUTIONS_QUERY_KEY } from './use-institutions.query';

export interface CreateInstitutionInput {
  typeCode: string;
  name: string;
  /** Solo lo manda superadmin (sin tenant propio) para indicar a cuál pertenece. */
  tenantId?: string;
}

export function useCreateInstitutionMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ tenantId, ...dto }: CreateInstitutionInput) => {
      const { data } = await apiClient.post<Institution>('/institutions', dto, {
        params: tenantId ? { tenantId } : undefined,
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: INSTITUTIONS_QUERY_KEY });
      toast.success('Institución creada.');
    },
  });
}
