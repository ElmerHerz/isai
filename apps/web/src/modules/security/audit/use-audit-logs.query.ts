import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { AuditLogPage } from '@isai/shared-types';

export interface AuditLogsFilters {
  page: number;
  pageSize: number;
  entityType?: string;
  action?: string;
  search?: string;
}

export const auditLogsQueryKey = (filters: AuditLogsFilters) => ['audit-logs', filters] as const;

// Paginado del lado del servidor (a diferencia del resto de las tablas de
// la app) — a diferencia de Personas/Grupos, la bitácora crece sin límite
// natural, no tiene sentido traerla completa al cliente.
export function useAuditLogsQuery(filters: AuditLogsFilters) {
  return useQuery({
    queryKey: auditLogsQueryKey(filters),
    queryFn: async () => {
      const { data } = await apiClient.get<AuditLogPage>('/audit-logs', { params: filters });
      return data;
    },
    // Mantiene la página anterior visible mientras carga la siguiente — sin
    // esto la tabla parpadea a "Cargando..." con cada cambio de página/filtro.
    placeholderData: keepPreviousData,
  });
}
