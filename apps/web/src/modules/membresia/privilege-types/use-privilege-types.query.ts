import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { PrivilegeType } from '@isai/shared-types';

export const privilegeTypesQueryKey = (tenantId?: string) => ['privilege-types', tenantId ?? null] as const;

// tenantId es solo para superadmin (elige a qué tenant le administra los
// tipos de privilegio desde un selector propio) — un Administrador normal no
// lo necesita, su tenant ya viene fijo en el JWT.
export function usePrivilegeTypesQuery(tenantId?: string) {
  return useQuery({
    queryKey: privilegeTypesQueryKey(tenantId),
    queryFn: async () => {
      const { data } = await apiClient.get<PrivilegeType[]>('/privilege-types', {
        params: tenantId ? { tenantId } : undefined,
      });
      return data;
    },
  });
}
