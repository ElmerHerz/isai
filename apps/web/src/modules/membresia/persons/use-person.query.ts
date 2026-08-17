import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { PersonWithRelations } from '@isai/shared-types';

export const personDetailKey = (id: string) => ['persons', 'detail', id] as const;

export function usePersonQuery(id: string) {
  return useQuery({
    queryKey: personDetailKey(id),
    queryFn: async () => {
      const { data } = await apiClient.get<PersonWithRelations>(`/persons/${id}`);
      return data;
    },
    enabled: !!id,
  });
}
