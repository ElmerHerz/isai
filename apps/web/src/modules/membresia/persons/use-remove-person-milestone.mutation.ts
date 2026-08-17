import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { toast } from '@/lib/toast';
import { personMilestonesKey } from './use-person-milestones.query';

export function useRemovePersonMilestoneMutation(personId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (milestoneId: string) => {
      await apiClient.delete(`/persons/${personId}/milestones/${milestoneId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: personMilestonesKey(personId) });
      toast.success('Hito eliminado.');
    },
  });
}
