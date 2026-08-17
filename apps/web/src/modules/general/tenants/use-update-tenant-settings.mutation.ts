import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { toast } from '@/lib/toast';
import type { Tenant } from '@isai/shared-types';
import { TENANT_SETTINGS_QUERY_KEY } from './use-tenant-settings.query';

export interface UpdateTenantSettingsInput {
  currencyCode?: string;
  countryCode?: string;
  languageCode?: string;
}

export function useUpdateTenantSettingsMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (dto: UpdateTenantSettingsInput) => {
      const { data } = await apiClient.patch<Tenant>('/tenants/me', dto);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TENANT_SETTINGS_QUERY_KEY });
      toast.success('Configuración guardada.');
    },
  });
}
