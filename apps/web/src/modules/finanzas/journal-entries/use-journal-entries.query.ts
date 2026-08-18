import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { JournalEntry } from '@isai/shared-types';

export const journalEntriesQueryKey = (tenantId?: string) => ['journal-entries', tenantId ?? null] as const;

export function useJournalEntriesQuery(tenantId?: string) {
  return useQuery({
    queryKey: journalEntriesQueryKey(tenantId),
    queryFn: async () => {
      const { data } = await apiClient.get<JournalEntry[]>('/journal-entries', {
        params: tenantId ? { tenantId } : undefined,
      });
      return data;
    },
  });
}
