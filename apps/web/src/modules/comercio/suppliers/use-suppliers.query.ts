import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { Supplier } from '@isai/shared-types';

export const suppliersQueryKey = ['suppliers'] as const;

export function useSuppliersQuery() {
  return useQuery({
    queryKey: suppliersQueryKey,
    queryFn: async () => {
      const { data } = await apiClient.get<Supplier[]>('/suppliers');
      return data;
    },
  });
}
