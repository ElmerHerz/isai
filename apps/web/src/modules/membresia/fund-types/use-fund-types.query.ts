import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { FundType } from '@isai/shared-types';

export const fundTypesQueryKey = (tenantId?: string) => ['fund-types', tenantId ?? null] as const;

// tenantId es solo para superadmin (elige a qué tenant le administra los
// tipos de fondo desde un selector propio) — un Administrador normal no lo
// necesita, su tenant ya viene fijo en el JWT. enabled adicional (default
// true) — quien llama debe apagarlo si sabe que el usuario actual no tiene
// membership.event.view (ej. un diálogo que se monta siempre, aunque
// cerrado), para no dispararle un 403 solo por abrir la página.
export function useFundTypesQuery(tenantId?: string, enabled: boolean = true) {
  return useQuery({
    queryKey: fundTypesQueryKey(tenantId),
    queryFn: async () => {
      const { data } = await apiClient.get<FundType[]>('/fund-types', {
        params: tenantId ? { tenantId } : undefined,
      });
      return data;
    },
    enabled,
  });
}
