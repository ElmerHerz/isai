import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { PersonPosition } from '@isai/shared-types';

export const personPositionsKey = (id: string) => ['persons', 'detail', id, 'positions'] as const;

export function usePersonPositionsQuery(id: string) {
  return useQuery({
    queryKey: personPositionsKey(id),
    queryFn: async () => {
      const { data } = await apiClient.get<PersonPosition[]>(`/persons/${id}/positions`);
      return data;
    },
    enabled: !!id,
  });
}
