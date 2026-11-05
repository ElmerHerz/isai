import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { toast } from '@/lib/toast';
import { USERS_QUERY_KEY } from './use-users.query';

export interface ResetUserPasswordInput {
  userId: string;
  newPassword: string;
}

export function useResetUserPasswordMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, newPassword }: ResetUserPasswordInput) => {
      await apiClient.post(`/users/${userId}/reset-password`, { newPassword });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: USERS_QUERY_KEY });
      toast.success('Contraseña restablecida.');
    },
  });
}
