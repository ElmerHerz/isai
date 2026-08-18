import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { toast } from '@/lib/toast';
import type { Account } from '@isai/shared-types';

export interface CreateAccountInput {
  code: string;
  name: string;
  accountTypeId: string;
  parentAccountId?: string;
  /** Solo para superadmin — a qué tenant pertenece la cuenta nueva. */
  tenantId?: string;
}

export function useCreateAccountMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ tenantId, ...dto }: CreateAccountInput) => {
      const { data } = await apiClient.post<Account>('/accounts', dto, {
        params: tenantId ? { tenantId } : undefined,
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      toast.success('Cuenta creada.');
    },
  });
}
