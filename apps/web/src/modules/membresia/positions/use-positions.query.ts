import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { GroupPositionWithRelations } from '@isai/shared-types';

export const positionsQueryKey = (institutionId: string) => ['group-positions', institutionId] as const;

// groupId opcional filtra del lado del backend (ej. para mostrar la
// directiva de un solo grupo en su página de detalle) — la query key sigue
// siendo un prefijo de positionsQueryKey(institutionId), así que invalidar
// con esa key base (como ya hacen las mutations) también invalida esta
// variante filtrada.
export function usePositionsQuery(institutionId: string, groupId?: string) {
  return useQuery({
    queryKey: groupId ? [...positionsQueryKey(institutionId), groupId] : positionsQueryKey(institutionId),
    queryFn: async () => {
      const { data } = await apiClient.get<GroupPositionWithRelations[]>('/group-positions', {
        params: { institutionId, groupId },
      });
      return data;
    },
    enabled: !!institutionId,
  });
}
