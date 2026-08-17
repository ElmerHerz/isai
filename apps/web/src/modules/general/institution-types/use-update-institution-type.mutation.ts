import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { toast } from '@/lib/toast';
import type { InstitutionType } from '@isai/shared-types';
import { INSTITUTION_TYPES_QUERY_KEY } from './use-institution-types.query';

export interface UpdateInstitutionTypeInput {
  name?: string;
  description?: string;
}

export function useUpdateInstitutionTypeMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ code, dto }: { code: string; dto: UpdateInstitutionTypeInput }) => {
      const { data } = await apiClient.patch<InstitutionType>(`/institution-types/${code}`, dto);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: INSTITUTION_TYPES_QUERY_KEY });
      toast.success('Tipo de institución actualizado.');
    },
  });
}
