import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { toast } from '@/lib/toast';
import type { Language } from '@isai/shared-types';
import { LANGUAGES_QUERY_KEY } from './use-languages.query';

export interface UpdateLanguageInput {
  name?: string;
}

export function useUpdateLanguageMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ code, dto }: { code: string; dto: UpdateLanguageInput }) => {
      const { data } = await apiClient.patch<Language>(`/languages/${code}`, dto);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: LANGUAGES_QUERY_KEY });
      toast.success('Idioma actualizado.');
    },
  });
}
