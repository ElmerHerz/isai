import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { toast } from '@/lib/toast';
import type { GroupPositionWithRelations } from '@isai/shared-types';
import { positionsQueryKey } from './use-positions.query';
import type { CreatePositionInput } from './use-create-position.mutation';

export type UpdatePositionInput = Partial<CreatePositionInput>;

export function useUpdatePositionMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, dto }: { id: string; dto: UpdatePositionInput }) => {
      const { data } = await apiClient.patch<GroupPositionWithRelations>(`/group-positions/${id}`, dto);
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: positionsQueryKey(data.group.institutionId) });
      toast.success('Cargo actualizado.');
    },
  });
}
