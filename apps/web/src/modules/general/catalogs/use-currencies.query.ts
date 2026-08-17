import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { Currency } from '@isai/shared-types';

export const CURRENCIES_QUERY_KEY = ['currencies'] as const;

export function useCurrenciesQuery() {
  return useQuery({
    queryKey: CURRENCIES_QUERY_KEY,
    queryFn: async () => {
      const { data } = await apiClient.get<Currency[]>('/currencies');
      return data;
    },
  });
}
