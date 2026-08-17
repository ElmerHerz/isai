import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { toast } from '@/lib/toast';
import type { InstitutionType } from '@isai/shared-types';
import { INSTITUTION_TYPES_QUERY_KEY } from './use-institution-types.query';

export interface CreateInstitutionTypeInput {
  code: string;
  name: string;
  description?: string;
}

export function useCreateInstitutionTypeMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (dto: CreateInstitutionTypeInput) => {
      const { data } = await apiClient.post<InstitutionType>('/institution-types', dto);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: INSTITUTION_TYPES_QUERY_KEY });
      toast.success('Tipo de institución creado.');
    },
  });
}
