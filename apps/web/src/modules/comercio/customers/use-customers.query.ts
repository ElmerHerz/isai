import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { Customer } from '@isai/shared-types';

export const customersQueryKey = ['customers'] as const;

export function useCustomersQuery() {
  return useQuery({
    queryKey: customersQueryKey,
    queryFn: async () => {
      const { data } = await apiClient.get<Customer[]>('/customers');
      return data;
    },
  });
}
