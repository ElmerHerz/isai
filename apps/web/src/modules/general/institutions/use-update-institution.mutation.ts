import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { toast } from '@/lib/toast';
import type { Institution } from '@isai/shared-types';
import { INSTITUTIONS_QUERY_KEY } from './use-institutions.query';

export interface UpdateInstitutionInput {
  typeCode?: string;
  name?: string;
  isActive?: boolean;
}

export function useUpdateInstitutionMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, dto }: { id: string; dto: UpdateInstitutionInput }) => {
      const { data } = await apiClient.patch<Institution>(`/institutions/${id}`, dto);
      return data;
    },
    onSuccess: () => {
      // Prefix match: invalida tanto la lista ['institutions'] como el
      // detalle ['institutions', 'detail', id].
      queryClient.invalidateQueries({ queryKey: INSTITUTIONS_QUERY_KEY });
      toast.success('Institución actualizada.');
    },
  });
}
