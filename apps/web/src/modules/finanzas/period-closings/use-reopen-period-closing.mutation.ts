import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { toast, getErrorMessage } from '@/lib/toast';
import type { PeriodClosing } from '@isai/shared-types';
import { periodClosingsQueryKey } from './use-period-closings.query';

export function useReopenPeriodClosingMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const { data } = await apiClient.post<PeriodClosing>(`/period-closings/${id}/reopen`, { reason });
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: periodClosingsQueryKey(data.institutionId) });
      toast.success('Periodo reabierto.');
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'No se pudo reabrir el periodo.'));
    },
  });
}
