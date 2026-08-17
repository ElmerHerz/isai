import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { PersonMilestone } from '@isai/shared-types';

export const personMilestonesKey = (id: string) => ['persons', 'detail', id, 'milestones'] as const;

export function usePersonMilestonesQuery(id: string) {
  return useQuery({
    queryKey: personMilestonesKey(id),
    queryFn: async () => {
      const { data } = await apiClient.get<PersonMilestone[]>(`/persons/${id}/milestones`);
      return data;
    },
    enabled: !!id,
  });
}
