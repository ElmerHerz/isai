import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { Account } from '@isai/shared-types';

export const accountsQueryKey = (tenantId?: string) => ['accounts', tenantId ?? null] as const;

// tenantId es solo para superadmin (selector propio, mismo patrón que el
// resto de catálogos por tenant) — un usuario normal ya tiene su tenant
// fijo en el JWT.
export function useAccountsQuery(tenantId?: string) {
  return useQuery({
    queryKey: accountsQueryKey(tenantId),
    queryFn: async () => {
      const { data } = await apiClient.get<Account[]>('/accounts', {
        params: tenantId ? { tenantId } : undefined,
      });
      return data;
    },
  });
}
