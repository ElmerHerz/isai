import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { AttendanceAbsenceRow } from '@isai/shared-types';
import type { AttendanceReportFilters } from './attendance-report-filters';

export const attendanceAbsencesKey = (institutionId: string, limit: number, filters: AttendanceReportFilters) =>
  ['reports', 'attendance-absences', institutionId, limit, filters] as const;

export function useAttendanceAbsencesQuery(institutionId: string, limit: number = 10, filters: AttendanceReportFilters = {}) {
  return useQuery({
    queryKey: attendanceAbsencesKey(institutionId, limit, filters),
    queryFn: async () => {
      const { data } = await apiClient.get<AttendanceAbsenceRow[]>('/reports/attendance-absences', {
        params: { institutionId, limit, ...filters },
      });
      return data;
    },
    enabled: !!institutionId,
  });
}
