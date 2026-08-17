import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { toast } from '@/lib/toast';
import type { Role } from '@isai/shared-types';

export interface CreateRoleInput {
  code: string;
  name: string;
  description?: string;
  /** Solo lo manda superadmin (sin tenant propio) para indicar a cuál pertenece. */
  tenantId?: string;
}

export function useCreateRoleMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ tenantId, ...dto }: CreateRoleInput) => {
      const { data } = await apiClient.post<Role>('/roles', dto, {
        params: tenantId ? { tenantId } : undefined,
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      toast.success('Rol creado.');
    },
  });
}
