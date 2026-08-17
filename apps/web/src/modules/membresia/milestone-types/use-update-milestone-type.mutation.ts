import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { toast } from '@/lib/toast';
import type { MilestoneType } from '@isai/shared-types';

export interface UpdateMilestoneTypeInput {
  name?: string;
  isActive?: boolean;
}

export function useUpdateMilestoneTypeMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, dto }: { id: string; dto: UpdateMilestoneTypeInput }) => {
      const { data } = await apiClient.patch<MilestoneType>(`/milestone-types/${id}`, dto);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['milestone-types'] });
      toast.success('Tipo de hito actualizado.');
    },
  });
}
