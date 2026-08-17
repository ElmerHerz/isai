import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { toast } from '@/lib/toast';
import type { FundType } from '@isai/shared-types';

export interface CreateFundTypeInput {
  code: string;
  name: string;
  /** Solo para superadmin — a qué tenant pertenece el tipo de fondo nuevo. */
  tenantId?: string;
}

export function useCreateFundTypeMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ tenantId, ...dto }: CreateFundTypeInput) => {
      const { data } = await apiClient.post<FundType>('/fund-types', dto, {
        params: tenantId ? { tenantId } : undefined,
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fund-types'] });
      toast.success('Tipo de fondo creado.');
    },
  });
}
