import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { useAuthStore } from '@/lib/auth-store';
import type { User } from '@isai/shared-types';

export const ME_QUERY_KEY = ['auth', 'me'] as const;

/**
 * useMeQuery — Trae el perfil del usuario autenticado y lo guarda en el auth store.
 *
 * Solo se ejecuta si ya hay un accessToken (evita pegarle a /auth/me sin sesión).
 */
export function useMeQuery() {
  const accessToken = useAuthStore((state) => state.accessToken);
  const setUser = useAuthStore((state) => state.setUser);

  return useQuery({
    queryKey: ME_QUERY_KEY,
    enabled: !!accessToken,
    queryFn: async () => {
      const { data } = await apiClient.get<User>('/auth/me');
      setUser(data);
      return data;
    },
  });
}
