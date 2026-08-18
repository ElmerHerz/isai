import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { toast } from '@/lib/toast';
import { USERS_QUERY_KEY } from './use-users.query';

export interface AssignRoleInput {
  userId: string;
  roleId: string;
  institutionId?: string;
  branchId?: string;
  groupId?: string;
  /** Debe coincidir con el tenantId usado al crear el usuario (superadmin). */
  tenantId?: string;
}

export function useAssignRoleMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, tenantId, ...dto }: AssignRoleInput) => {
      const { data } = await apiClient.post(`/users/${userId}/roles`, dto, {
        params: tenantId ? { tenantId } : undefined,
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: USERS_QUERY_KEY });
      toast.success('Rol asignado.');
    },
  });
}
