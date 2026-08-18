import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { PersonWithRelations } from '@isai/shared-types';

export const personsQueryKey = (institutionId: string) => ['persons', institutionId] as const;

// enabled adicional (default true) — quien llama debe apagarlo si sabe que
// el usuario actual no tiene membership.person.view (ej. un diálogo que se
// monta siempre, aunque cerrado, en una página que también visitan roles
// angostos como Tesorero), para no dispararle un 403 solo por abrir la
// página. Mismo criterio que useGroupFundBalanceQuery/useInstitutionsQuery.
export function usePersonsQuery(institutionId: string, enabled: boolean = true) {
  return useQuery({
    queryKey: personsQueryKey(institutionId),
    queryFn: async () => {
      const { data } = await apiClient.get<PersonWithRelations[]>('/persons', {
        params: { institutionId },
      });
      return data;
    },
    enabled: !!institutionId && enabled,
  });
}
