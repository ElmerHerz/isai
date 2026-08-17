import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { UserListItem } from '@isai/shared-types';

export const USERS_QUERY_KEY = ['users'] as const;

export function useUsersQuery() {
  return useQuery({
    queryKey: USERS_QUERY_KEY,
    queryFn: async () => {
      const { data } = await apiClient.get<UserListItem[]>('/users');
      return data;
    },
  });
}
