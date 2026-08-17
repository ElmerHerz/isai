import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { toast } from '@/lib/toast';
import type { GroupWithRelations } from '@isai/shared-types';
import { groupsQueryKey } from './use-groups.query';
import { groupDetailKey } from './use-group.query';
import type { CreateGroupInput } from './use-create-group.mutation';

export type UpdateGroupInput = Partial<CreateGroupInput> & { isActive?: boolean };

export function useUpdateGroupMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, dto }: { id: string; dto: UpdateGroupInput }) => {
      const { data } = await apiClient.patch<GroupWithRelations>(`/groups/${id}`, dto);
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: groupsQueryKey(data.institutionId) });
      queryClient.invalidateQueries({ queryKey: groupDetailKey(data.id) });
      toast.success('Grupo actualizado.');
    },
  });
}
