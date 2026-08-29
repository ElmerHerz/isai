import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { toast } from '@/lib/toast';
import { myPendingApprovalsKey } from './use-my-pending-approvals.query';
import { allPendingApprovalsKey } from './use-all-pending-approvals.query';
import type { PendingApprovalRow } from '@isai/shared-types';

export interface DecidePendingApprovalInput {
  sourceType: PendingApprovalRow['sourceType'];
  parentId: string; // project.id o group.id, según sourceType
  expenseId: string; // sourceId
  action: 'approve' | 'reject';
  reason?: string;
}

// Dispatcher genérico: el monitor mezcla gastos de Proyecto y de Fondo de
// Grupo en una sola lista, así que no puede usar los hooks dedicados
// (useApproveProjectExpenseMutation(projectId) etc.) — esos están atados a
// UN solo proyecto/grupo por closure. Acá se arma la URL correcta según
// sourceType y se llama al mismo endpoint de siempre.
export function useDecidePendingApprovalMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ sourceType, parentId, expenseId, action, reason }: DecidePendingApprovalInput) => {
      const base =
        sourceType === 'project_expense'
          ? `/projects/${parentId}/expenses/${expenseId}`
          : `/groups/${parentId}/fund-expenses/${expenseId}`;
      const { data } = await apiClient.post(`${base}/${action}`, action === 'reject' ? { reason } : undefined);
      return data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: myPendingApprovalsKey });
      queryClient.invalidateQueries({ queryKey: allPendingApprovalsKey });
      // La cola de aprobaciones no sabe qué proyecto/grupo puntual tocó —
      // invalida por prefijo para que $projectId.tsx/$groupId.tsx (si el
      // usuario navega ahí después) no se queden con la caché vieja
      // ('pending' aunque el backend ya diga 'approved'/'rejected').
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['groups'] });
      toast.success(variables.action === 'approve' ? 'Gasto aprobado.' : 'Gasto rechazado.');
    },
  });
}
