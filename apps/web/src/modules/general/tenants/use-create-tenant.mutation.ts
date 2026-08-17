import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { toast } from '@/lib/toast';
import type { Tenant } from '@isai/shared-types';
import { TENANTS_QUERY_KEY } from './use-tenants.query';

export interface CreateTenantInput {
  slug: string;
  name: string;
}

export function useCreateTenantMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (dto: CreateTenantInput) => {
      const { data } = await apiClient.post<Tenant>('/tenants', dto);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TENANTS_QUERY_KEY });
      toast.success('Tenant creado.');
    },
  });
}
