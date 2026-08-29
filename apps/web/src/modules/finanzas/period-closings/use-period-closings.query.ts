import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { PeriodClosing } from '@isai/shared-types';

export const periodClosingsQueryKey = (institutionId: string) => ['period-closings', institutionId] as const;

export function usePeriodClosingsQuery(institutionId: string) {
  return useQuery({
    queryKey: periodClosingsQueryKey(institutionId),
    queryFn: async () => {
      const { data } = await apiClient.get<PeriodClosing[]>('/period-closings', { params: { institutionId } });
      return data;
    },
    enabled: !!institutionId,
  });
}
