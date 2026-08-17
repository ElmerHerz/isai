import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { toast } from '@/lib/toast';
import type { Role } from '@isai/shared-types';

export interface UpdateRoleInput {
  code?: string;
  name?: string;
  description?: string;
}

export function useUpdateRoleMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, dto }: { id: string; dto: UpdateRoleInput }) => {
      const { data } = await apiClient.patch<Role>(`/roles/${id}`, dto);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      toast.success('Rol actualizado.');
    },
  });
}
