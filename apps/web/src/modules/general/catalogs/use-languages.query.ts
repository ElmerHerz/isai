import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { Language } from '@isai/shared-types';

export const LANGUAGES_QUERY_KEY = ['languages'] as const;

export function useLanguagesQuery() {
  return useQuery({
    queryKey: LANGUAGES_QUERY_KEY,
    queryFn: async () => {
      const { data } = await apiClient.get<Language[]>('/languages');
      return data;
    },
  });
}
