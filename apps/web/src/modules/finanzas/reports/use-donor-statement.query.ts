import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { DonorStatement } from '@isai/shared-types';

export const donorStatementKey = (personId: string, year: number) => ['reports', 'donor-statement', personId, year] as const;

export function useDonorStatementQuery(personId: string, year: number) {
  return useQuery({
    queryKey: donorStatementKey(personId, year),
    queryFn: async () => {
      const { data } = await apiClient.get<DonorStatement>('/reports/donor-statement', { params: { personId, year } });
      return data;
    },
    enabled: !!personId && !!year,
  });
}
