import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { toast } from '@/lib/toast';
import type { User } from '@isai/shared-types';
import { USERS_QUERY_KEY } from './use-users.query';

export interface CreateUserInput {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  /** Solo lo manda superadmin (sin tenant propio) para indicar a cuál pertenece. */
  tenantId?: string;
}

export function useCreateUserMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ tenantId, ...dto }: CreateUserInput) => {
      const { data } = await apiClient.post<User>('/users', dto, {
        params: tenantId ? { tenantId } : undefined,
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: USERS_QUERY_KEY });
      toast.success('Usuario creado.');
    },
  });
}
