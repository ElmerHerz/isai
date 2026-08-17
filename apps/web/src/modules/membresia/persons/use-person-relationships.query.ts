import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { PersonRelationshipItem } from '@isai/shared-types';

export const personRelationshipsKey = (id: string) => ['persons', 'detail', id, 'relationships'] as const;

export function usePersonRelationshipsQuery(id: string) {
  return useQuery({
    queryKey: personRelationshipsKey(id),
    queryFn: async () => {
      const { data } = await apiClient.get<PersonRelationshipItem[]>(`/persons/${id}/relationships`);
      return data;
    },
    enabled: !!id,
  });
}
