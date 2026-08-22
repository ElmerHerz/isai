import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { AttendanceTrendPoint } from '@isai/shared-types';
import type { AttendanceReportFilters } from './attendance-report-filters';

export const attendanceTrendKey = (institutionId: string, filters: AttendanceReportFilters) =>
  ['reports', 'attendance-trend', institutionId, filters] as const;

export function useAttendanceTrendQuery(institutionId: string, filters: AttendanceReportFilters = {}) {
  return useQuery({
    queryKey: attendanceTrendKey(institutionId, filters),
    queryFn: async () => {
      const { data } = await apiClient.get<AttendanceTrendPoint[]>('/reports/attendance-trend', {
        params: { institutionId, ...filters },
      });
      return data;
    },
    enabled: !!institutionId,
  });
}
