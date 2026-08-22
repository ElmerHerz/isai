import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { ReportScheduleOption } from '@isai/shared-types';

export const reportSchedulesKey = (institutionId: string) => ['reports', 'schedules', institutionId] as const;

export function useReportSchedulesQuery(institutionId: string) {
  return useQuery({
    queryKey: reportSchedulesKey(institutionId),
    queryFn: async () => {
      const { data } = await apiClient.get<ReportScheduleOption[]>('/reports/schedules', {
        params: { institutionId },
      });
      return data;
    },
    enabled: !!institutionId,
  });
}
