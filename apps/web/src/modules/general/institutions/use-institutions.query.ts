import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { Institution } from '@isai/shared-types';

export const institutionsQueryKey = (tenantId: string) =>
  ['institutions', tenantId] as const;

export function useInstitutionsQuery(tenantId: string) {
  return useQuery({
    queryKey: institutionsQueryKey(tenantId),
    queryFn: async () => {
      const { data } = await apiClient.get<Institution[]>('/institutions');
      return data;
    },
    enabled: !!tenantId,
  });
}
