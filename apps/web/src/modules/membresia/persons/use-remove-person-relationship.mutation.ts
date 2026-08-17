import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { toast } from '@/lib/toast';
import { personRelationshipsKey } from './use-person-relationships.query';

export function useRemovePersonRelationshipMutation(personId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (relationshipId: string) => {
      await apiClient.delete(`/persons/${personId}/relationships/${relationshipId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: personRelationshipsKey(personId) });
      toast.success('Familiar quitado.');
    },
  });
}
