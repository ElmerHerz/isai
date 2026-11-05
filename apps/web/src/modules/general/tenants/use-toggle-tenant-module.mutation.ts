import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { toast, getErrorMessage } from '@/lib/toast';
import { TENANTS_QUERY_KEY } from './use-tenants.query';

export interface ToggleTenantModuleInput {
  tenantId: string;
  moduleCode: string;
  activate: boolean;
}

export function useToggleTenantModuleMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ tenantId, moduleCode, activate }: ToggleTenantModuleInput) => {
      if (activate) {
        await apiClient.post(`/tenants/${tenantId}/modules/${moduleCode}`);
      } else {
        await apiClient.delete(`/tenants/${tenantId}/modules/${moduleCode}`);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TENANTS_QUERY_KEY });
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'No se pudo actualizar el módulo.'));
    },
  });
}
