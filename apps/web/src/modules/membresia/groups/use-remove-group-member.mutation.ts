import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { toast } from '@/lib/toast';
import { groupMembersQueryKey } from './use-group-members.query';

// Cierra la membresía (leftAt = ahora) en el backend — no borra el historial.
export function useRemoveGroupMemberMutation(groupId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (memberId: string) => {
      await apiClient.delete(`/groups/${groupId}/members/${memberId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: groupMembersQueryKey(groupId) });
      toast.success('Persona quitada del grupo.');
    },
  });
}
