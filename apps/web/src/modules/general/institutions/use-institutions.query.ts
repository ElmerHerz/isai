import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { InstitutionListItem, InstitutionWithBranches } from '@isai/shared-types';

export const INSTITUTIONS_QUERY_KEY = ['institutions'] as const;
export const institutionDetailKey = (id: string) => ['institutions', 'detail', id] as const;

/**
 * useInstitutionsQuery — Lista instituciones visibles para el usuario actual.
 *
 * Sin argumentos, el backend resuelve el tenant desde el JWT (o ve todas si
 * es superadmin sin tenant elegido), y aplica además el scope de user_roles.
 * `tenantId` opcional: cuando el llamador es superadmin y ya eligió un tenant
 * específico en un formulario (ej. crear usuario), se manda como query param
 * para traer solo las instituciones de ESE tenant.
 */
// enabled adicional (default true) — quien llama debe apagarlo si sabe que
// el usuario actual no tiene core.institution.view (ej. Home dashboard con
// un usuario tipo Tesorero), para no dispararle un 403 (y su toast
// automático) solo por cargar una tarjeta informativa.
export function useInstitutionsQuery(tenantId?: string, enabled: boolean = true) {
  return useQuery({
    queryKey: tenantId ? [...INSTITUTIONS_QUERY_KEY, tenantId] : INSTITUTIONS_QUERY_KEY,
    queryFn: async () => {
      const { data } = await apiClient.get<InstitutionListItem[]>('/institutions', {
        params: tenantId ? { tenantId } : undefined,
      });
      return data;
    },
    enabled,
  });
}

export function useInstitutionQuery(id: string) {
  return useQuery({
    queryKey: institutionDetailKey(id),
    queryFn: async () => {
      const { data } = await apiClient.get<InstitutionWithBranches>(`/institutions/${id}`);
      return data;
    },
    enabled: !!id,
  });
}
