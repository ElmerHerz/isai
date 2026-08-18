import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { GroupFundSummary } from '@isai/shared-types';

export const groupFundsSummaryKey = (institutionId: string) => ['groups', 'fund-summary', institutionId] as const;

// Alimenta la pantalla "Fondos de Grupo" (lista) — el backend ya filtra por
// el alcance del usuario (resolveGroupScope): un Administrador/Pastor ve
// todos los grupos de la institución, un Tesorero solo el suyo. No hace
// falta un `enabled` de permiso acá como en otros hooks de este módulo — la
// ruta ya vive detrás de finance.group_fund.view en el menú (ver
// FIN_GROUP_FUNDS), así que nadie sin ese permiso llega a montar esta query.
export function useGroupFundsSummaryQuery(institutionId: string) {
  return useQuery({
    queryKey: groupFundsSummaryKey(institutionId),
    queryFn: async () => {
      const { data } = await apiClient.get<GroupFundSummary[]>('/groups/fund-summary', {
        params: { institutionId },
      });
      return data;
    },
    enabled: !!institutionId,
  });
}
