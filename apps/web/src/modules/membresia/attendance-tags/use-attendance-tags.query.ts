import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { AttendanceTag } from '@isai/shared-types';

export const attendanceTagsQueryKey = (tenantId?: string) => ['attendance-tags', tenantId ?? null] as const;

// tenantId es solo para superadmin (elige a qué tenant le administra las
// etiquetas desde un selector propio en la pantalla) — un Administrador
// normal no lo necesita, su tenant ya viene fijo en el JWT y gana sobre
// este parámetro (ver resolveTenantId en el backend).
export function useAttendanceTagsQuery(tenantId?: string) {
  return useQuery({
    queryKey: attendanceTagsQueryKey(tenantId),
    queryFn: async () => {
      const { data } = await apiClient.get<AttendanceTag[]>('/attendance-tags', {
        params: tenantId ? { tenantId } : undefined,
      });
      return data;
    },
  });
}
