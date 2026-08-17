import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { toast } from '@/lib/toast';
import type { Currency } from '@isai/shared-types';
import { CURRENCIES_QUERY_KEY } from './use-currencies.query';

export interface UpdateCurrencyInput {
  name?: string;
  symbol?: string;
  decimalPlaces?: number;
  isActive?: boolean;
}

export function useUpdateCurrencyMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ code, dto }: { code: string; dto: UpdateCurrencyInput }) => {
      const { data } = await apiClient.patch<Currency>(`/currencies/${code}`, dto);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CURRENCIES_QUERY_KEY });
      toast.success('Moneda actualizada.');
    },
  });
}
