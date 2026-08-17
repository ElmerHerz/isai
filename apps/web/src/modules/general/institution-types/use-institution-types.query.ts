import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { InstitutionType } from '@isai/shared-types';

export const INSTITUTION_TYPES_QUERY_KEY = ['institution-types'] as const;

/** Catálogo estático (church/store/pharmacy/nursing_home/generic) — no cambia en la sesión. */
export function useInstitutionTypesQuery() {
  return useQuery({
    queryKey: INSTITUTION_TYPES_QUERY_KEY,
    queryFn: async () => {
      const { data } = await apiClient.get<InstitutionType[]>('/institution-types');
      return data;
    },
    staleTime: Infinity,
  });
}
