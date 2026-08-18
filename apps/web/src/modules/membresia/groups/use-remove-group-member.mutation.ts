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
      // La lista de grupos trae _count.members — sin esto queda
      // desactualizada hasta que expire el staleTime (hallazgo de auditoría).
      queryClient.invalidateQueries({ queryKey: ['groups'] });
      toast.success('Persona quitada del grupo.');
    },
  });
}
