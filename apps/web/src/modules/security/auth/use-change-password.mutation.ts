import { useMutation } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { useAuthStore } from '@/lib/auth-store';
import { toast } from '@/lib/toast';

interface ChangePasswordPayload {
  currentPassword: string;
  newPassword: string;
}

interface ChangePasswordResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  mustChangePassword: boolean;
}

/**
 * useChangePasswordMutation — Cambio de contraseña de autoservicio.
 *
 * El backend reemite tokens al cambiarla (ver AuthService.changePassword)
 * para que el nuevo JWT ya traiga mustChangePassword: false de inmediato.
 */
export function useChangePasswordMutation() {
  const { setTokens } = useAuthStore();

  return useMutation({
    mutationFn: async (payload: ChangePasswordPayload) => {
      const { data } = await apiClient.post<ChangePasswordResponse>('/auth/change-password', payload, {
        skipErrorToast: true,
      });
      return data;
    },
    onSuccess: (data) => {
      setTokens(data.accessToken, data.refreshToken);
      toast.success('Contraseña actualizada.');
    },
  });
}
