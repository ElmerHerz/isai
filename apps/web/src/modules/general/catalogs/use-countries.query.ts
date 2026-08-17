import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { Country } from '@isai/shared-types';

export const COUNTRIES_QUERY_KEY = ['countries'] as const;

export function useCountriesQuery() {
  return useQuery({
    queryKey: COUNTRIES_QUERY_KEY,
    queryFn: async () => {
      const { data } = await apiClient.get<Country[]>('/countries');
      return data;
    },
  });
}
