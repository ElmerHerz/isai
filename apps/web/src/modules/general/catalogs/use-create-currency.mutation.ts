import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { toast } from '@/lib/toast';
import type { Currency } from '@isai/shared-types';
import { CURRENCIES_QUERY_KEY } from './use-currencies.query';

export interface CreateCurrencyInput {
  code: string;
  name: string;
  symbol: string;
  decimalPlaces?: number;
  isActive?: boolean;
}

export function useCreateCurrencyMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (dto: CreateCurrencyInput) => {
      const { data } = await apiClient.post<Currency>('/currencies', dto);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CURRENCIES_QUERY_KEY });
      toast.success('Moneda creada.');
    },
  });
}
