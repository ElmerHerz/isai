import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { Tenant } from '@isai/shared-types';

export const TENANT_SETTINGS_QUERY_KEY = ['tenants', 'me'] as const;

export function useTenantSettingsQuery(enabled = true) {
  return useQuery({
    queryKey: TENANT_SETTINGS_QUERY_KEY,
    queryFn: async () => {
      const { data } = await apiClient.get<Tenant>('/tenants/me');
      return data;
    },
    // GET /tenants/me exige un tenant real en el JWT (o ?tenantId= en la
    // URL) — un superadmin sin tenant elegido no tiene "su" configuración,
    // así que sin esto el 403/400 sale como toast en cualquier pantalla que
    // use este hook para un detalle secundario (ej. prellenar un país por
    // defecto) mientras estás logueado como superadmin.
    enabled,
  });
}
