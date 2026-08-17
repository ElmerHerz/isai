import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { toast } from '@/lib/toast';
import type { GroupPositionWithRelations } from '@isai/shared-types';
import { positionsQueryKey } from './use-positions.query';

export interface CreatePositionInput {
  groupId: string;
  personId: string;
  positionId: string;
  termStart?: string;
  termEnd?: string;
}

export function useCreatePositionMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (dto: CreatePositionInput) => {
      const { data } = await apiClient.post<GroupPositionWithRelations>('/group-positions', dto);
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: positionsQueryKey(data.group.institutionId) });
      toast.success('Cargo asignado.');
    },
  });
}
