import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { UserListItem } from '@isai/shared-types';

export const USERS_QUERY_KEY = ['users'] as const;

// enabled adicional (default true) — quien llama debe apagarlo si sabe que
// el usuario actual no tiene security.user.view (ej. un diálogo que se
// monta siempre, aunque cerrado, en una página que también visitan roles
// angostos), para no dispararle un 403 solo por abrir la página.
export function useUsersQuery(enabled: boolean = true) {
  return useQuery({
    queryKey: USERS_QUERY_KEY,
    queryFn: async () => {
      const { data } = await apiClient.get<UserListItem[]>('/users');
      return data;
    },
    enabled,
  });
}
