import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { toast } from '@/lib/toast';
import type { GroupWithRelations } from '@isai/shared-types';
import { groupsQueryKey } from './use-groups.query';

export interface CreateGroupInput {
  institutionId: string;
  branchId?: string;
  groupTypeId: string;
  name: string;
  description?: string;
  leaderPersonId?: string;
}

export function useCreateGroupMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (dto: CreateGroupInput) => {
      const { data } = await apiClient.post<GroupWithRelations>('/groups', dto);
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: groupsQueryKey(data.institutionId) });
      toast.success('Grupo creado.');
    },
  });
}
