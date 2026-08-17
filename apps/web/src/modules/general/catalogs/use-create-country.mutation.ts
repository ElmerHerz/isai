import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { toast } from '@/lib/toast';
import type { Country } from '@isai/shared-types';
import { COUNTRIES_QUERY_KEY } from './use-countries.query';

export interface CreateCountryInput {
  code: string;
  name: string;
  phonePrefix?: string;
  defaultCurrencyCode?: string;
  isActive?: boolean;
}

export function useCreateCountryMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (dto: CreateCountryInput) => {
      const { data } = await apiClient.post<Country>('/countries', dto);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: COUNTRIES_QUERY_KEY });
      toast.success('País creado.');
    },
  });
}
