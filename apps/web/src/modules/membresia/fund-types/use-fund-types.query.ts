import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { FundType } from '@isai/shared-types';

export const fundTypesQueryKey = (tenantId?: string) => ['fund-types', tenantId ?? null] as const;

// tenantId es solo para superadmin (elige a qué tenant le administra los
// tipos de fondo desde un selector propio) — un Administrador normal no lo
// necesita, su tenant ya viene fijo en el JWT.
export function useFundTypesQuery(tenantId?: string) {
  return useQuery({
    queryKey: fundTypesQueryKey(tenantId),
    queryFn: async () => {
      const { data } = await apiClient.get<FundType[]>('/fund-types', {
        params: tenantId ? { tenantId } : undefined,
      });
      return data;
    },
  });
}
