import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { toast } from '@/lib/toast';
import type { Country } from '@isai/shared-types';
import { COUNTRIES_QUERY_KEY } from './use-countries.query';

export interface UpdateCountryInput {
  name?: string;
  phonePrefix?: string;
  defaultCurrencyCode?: string;
  isActive?: boolean;
}

export function useUpdateCountryMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ code, dto }: { code: string; dto: UpdateCountryInput }) => {
      const { data } = await apiClient.patch<Country>(`/countries/${code}`, dto);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: COUNTRIES_QUERY_KEY });
      toast.success('País actualizado.');
    },
  });
}
