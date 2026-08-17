import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { toast } from '@/lib/toast';
import type { BranchSchedule } from '@isai/shared-types';
import { branchSchedulesQueryKey } from './use-branch-schedules.query';
import type { CreateBranchScheduleInput } from './use-create-branch-schedule.mutation';

export type UpdateBranchScheduleInput = Partial<CreateBranchScheduleInput>;

export function useUpdateBranchScheduleMutation(branchId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, dto }: { id: string; dto: UpdateBranchScheduleInput }) => {
      const { data } = await apiClient.patch<BranchSchedule>(`/branches/${branchId}/schedules/${id}`, dto);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: branchSchedulesQueryKey(branchId) });
      toast.success('Franja de horario actualizada.');
    },
  });
}
