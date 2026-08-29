import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { toast, getErrorMessage } from '@/lib/toast';
import type { PeriodClosing } from '@isai/shared-types';
import { periodClosingsQueryKey } from './use-period-closings.query';

export interface ClosePeriodInput {
  institutionId: string;
  branchId?: string;
  closedThroughDate: string;
  targetEquityAccountId: string;
  notes?: string;
}

export function useClosePeriodMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (dto: ClosePeriodInput) => {
      const { data } = await apiClient.post<PeriodClosing>('/period-closings', dto);
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: periodClosingsQueryKey(data.institutionId) });
      toast.success('Periodo cerrado.');
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'No se pudo cerrar el periodo.'));
    },
  });
}
