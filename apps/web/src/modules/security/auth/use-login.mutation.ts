import { useMutation } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { useAuthStore } from '@/lib/auth-store';

interface LoginPayload {
  email: string;
  password: string;
}

interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

/**
 * useLoginMutation — Mutation de login.
 *
 * En onSuccess: guarda tokens en el auth store (Zustand),
 * que los persiste en localStorage automáticamente.
 */
export function useLoginMutation() {
  const { setTokens } = useAuthStore();

  return useMutation({
    mutationFn: async (payload: LoginPayload) => {
      // login.tsx ya muestra su propio "Credenciales inválidas" inline —
      // sin esto se duplicaría con el toast automático del interceptor.
      const { data } = await apiClient.post<LoginResponse>('/auth/login', payload, {
        skipErrorToast: true,
      });
      return data;
    },
    onSuccess: (data) => {
      setTokens(data.accessToken, data.refreshToken);
    },
  });
}
