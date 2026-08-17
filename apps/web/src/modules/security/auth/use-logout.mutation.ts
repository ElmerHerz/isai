import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { apiClient } from '@/lib/api-client';
import { useAuthStore } from '@/lib/auth-store';

/**
 * useLogoutMutation — Cierra sesión.
 *
 * Avisa al backend (best-effort: aunque falle, igual se limpia la sesión
 * local) y siempre termina limpiando el store + redirigiendo a /login.
 */
export function useLogoutMutation() {
  const logout = useAuthStore((state) => state.logout);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: async () => {
      await apiClient.post('/auth/logout');
    },
    onSettled: () => {
      logout();
      queryClient.clear();
      navigate({ to: '/login' });
    },
  });
}
