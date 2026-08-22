import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { AttendanceByBranchRow } from '@isai/shared-types';
import type { AttendanceReportFilters } from './attendance-report-filters';

export const attendanceByBranchKey = (institutionId: string, filters: Omit<AttendanceReportFilters, 'branchId'>) =>
  ['reports', 'attendance-by-branch', institutionId, filters] as const;

export function useAttendanceByBranchQuery(institutionId: string, filters: Omit<AttendanceReportFilters, 'branchId'> = {}) {
  return useQuery({
    queryKey: attendanceByBranchKey(institutionId, filters),
    queryFn: async () => {
      const { data } = await apiClient.get<AttendanceByBranchRow[]>('/reports/attendance-by-branch', {
        params: { institutionId, ...filters },
      });
      return data;
    },
    enabled: !!institutionId,
  });
}
