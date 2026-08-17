import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

export const AUDIT_ENTITY_TYPES_QUERY_KEY = ['audit-logs', 'entity-types'] as const;

export function useAuditEntityTypesQuery() {
  return useQuery({
    queryKey: AUDIT_ENTITY_TYPES_QUERY_KEY,
    queryFn: async () => {
      const { data } = await apiClient.get<string[]>('/audit-logs/entity-types');
      return data;
    },
  });
}
