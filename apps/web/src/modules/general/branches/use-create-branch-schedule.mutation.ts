import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { toast } from '@/lib/toast';
import type { BranchSchedule } from '@isai/shared-types';
import { branchSchedulesQueryKey } from './use-branch-schedules.query';

export interface CreateBranchScheduleInput {
  scheduleTypeId: string;
  dayOfWeek: number;
  startTime: string;
  endTime?: string;
  label?: string;
}

export function useCreateBranchScheduleMutation(branchId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (dto: CreateBranchScheduleInput) => {
      const { data } = await apiClient.post<BranchSchedule>(`/branches/${branchId}/schedules`, dto);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: branchSchedulesQueryKey(branchId) });
      toast.success('Franja de horario agregada.');
    },
  });
}
