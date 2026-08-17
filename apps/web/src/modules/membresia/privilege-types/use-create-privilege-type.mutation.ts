import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { toast } from '@/lib/toast';
import type { PrivilegeType } from '@isai/shared-types';

export interface CreatePrivilegeTypeInput {
  code: string;
  name: string;
  /** Solo para superadmin — a qué tenant pertenece el tipo de privilegio nuevo. */
  tenantId?: string;
}

export function useCreatePrivilegeTypeMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ tenantId, ...dto }: CreatePrivilegeTypeInput) => {
      const { data } = await apiClient.post<PrivilegeType>('/privilege-types', dto, {
        params: tenantId ? { tenantId } : undefined,
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['privilege-types'] });
      toast.success('Tipo de privilegio creado.');
    },
  });
}
