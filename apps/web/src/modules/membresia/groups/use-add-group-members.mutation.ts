import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { toast } from '@/lib/toast';
import type { GroupMemberWithPerson } from '@isai/shared-types';
import { groupMembersQueryKey } from './use-group-members.query';

export interface AddGroupMemberInput {
  personId: string;
  role?: string;
  joinedAt?: string;
}

// Agrega varias personas de una sola vez (checklist en el diálogo, no una
// por una) — un POST por persona en paralelo, un solo toast de resumen al
// final en vez de uno por persona.
export function useAddGroupMembersMutation(groupId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (members: AddGroupMemberInput[]) => {
      const results = await Promise.all(
        members.map((dto) => apiClient.post<GroupMemberWithPerson>(`/groups/${groupId}/members`, dto)),
      );
      return results.map((r) => r.data);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: groupMembersQueryKey(groupId) });
      // La lista de grupos trae _count.members — sin esto queda
      // desactualizada hasta que expire el staleTime (hallazgo de auditoría).
      queryClient.invalidateQueries({ queryKey: ['groups'] });
      toast.success(
        data.length === 1 ? 'Persona agregada al grupo.' : `${data.length} personas agregadas al grupo.`,
      );
    },
  });
}
