import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { PersonWithRelations } from '@isai/shared-types';

export const personsQueryKey = (institutionId: string) => ['persons', institutionId] as const;

export function usePersonsQuery(institutionId: string) {
  return useQuery({
    queryKey: personsQueryKey(institutionId),
    queryFn: async () => {
      const { data } = await apiClient.get<PersonWithRelations[]>('/persons', {
        params: { institutionId },
      });
      return data;
    },
    enabled: !!institutionId,
  });
}
