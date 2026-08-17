import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { toast } from '@/lib/toast';
import type { PersonMilestone } from '@isai/shared-types';
import { personMilestonesKey } from './use-person-milestones.query';

export interface CreatePersonMilestoneInput {
  milestoneTypeId: string;
  occurredOn: string;
  notes?: string;
}

export function useCreatePersonMilestoneMutation(personId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (dto: CreatePersonMilestoneInput) => {
      const { data } = await apiClient.post<PersonMilestone>(`/persons/${personId}/milestones`, dto);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: personMilestonesKey(personId) });
      toast.success('Hito registrado.');
    },
  });
}
