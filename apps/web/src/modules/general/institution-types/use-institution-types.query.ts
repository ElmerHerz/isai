import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { InstitutionType } from '@isai/shared-types';

export const INSTITUTION_TYPES_QUERY_KEY = ['institution-types'] as const;

// enabled adicional (default true) — quien llama debe apagarlo si sabe que
// el usuario actual no tiene core.institution.view (ej. un diálogo que se
// monta siempre, aunque cerrado), para no dispararle un 403 solo por abrir
// la página. Catálogo estático (church/store/pharmacy/nursing_home/generic)
// — no cambia en la sesión.
export function useInstitutionTypesQuery(enabled: boolean = true) {
  return useQuery({
    queryKey: INSTITUTION_TYPES_QUERY_KEY,
    queryFn: async () => {
      const { data } = await apiClient.get<InstitutionType[]>('/institution-types');
      return data;
    },
    staleTime: Infinity,
    enabled,
  });
}
