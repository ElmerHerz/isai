import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { MilestoneType } from '@isai/shared-types';

export const milestoneTypesQueryKey = (tenantId?: string) => ['milestone-types', tenantId ?? null] as const;

// tenantId es solo para superadmin (elige a qué tenant le administra los
// tipos de hito desde un selector propio) — un Administrador normal no lo
// necesita, su tenant ya viene fijo en el JWT.
export function useMilestoneTypesQuery(tenantId?: string) {
  return useQuery({
    queryKey: milestoneTypesQueryKey(tenantId),
    queryFn: async () => {
      const { data } = await apiClient.get<MilestoneType[]>('/milestone-types', {
        params: tenantId ? { tenantId } : undefined,
      });
      return data;
    },
  });
}
