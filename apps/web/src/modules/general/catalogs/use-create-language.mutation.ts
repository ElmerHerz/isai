import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { toast } from '@/lib/toast';
import type { Language } from '@isai/shared-types';
import { LANGUAGES_QUERY_KEY } from './use-languages.query';

export interface CreateLanguageInput {
  code: string;
  name: string;
}

export function useCreateLanguageMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (dto: CreateLanguageInput) => {
      const { data } = await apiClient.post<Language>('/languages', dto);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: LANGUAGES_QUERY_KEY });
      toast.success('Idioma creado.');
    },
  });
}
