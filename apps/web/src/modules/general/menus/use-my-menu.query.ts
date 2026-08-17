import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { MenuNode } from '@isai/shared-types';

export const MY_MENU_QUERY_KEY = ['menus', 'me'] as const;

/**
 * useMyMenuQuery — Trae el árbol de navegación efectivo del usuario
 * autenticado (ya filtrado por módulos activos del tenant y sus permisos).
 */
export function useMyMenuQuery() {
  return useQuery({
    queryKey: MY_MENU_QUERY_KEY,
    queryFn: async () => {
      const { data } = await apiClient.get<MenuNode[]>('/menus/me');
      return data;
    },
  });
}
