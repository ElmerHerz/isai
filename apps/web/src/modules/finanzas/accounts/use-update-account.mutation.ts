import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { toast } from '@/lib/toast';
import type { Account } from '@isai/shared-types';

export interface UpdateAccountInput {
  id: string;
  code?: string;
  name?: string;
  parentAccountId?: string;
  allowsTransactions?: boolean;
}

export function useUpdateAccountMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...dto }: UpdateAccountInput) => {
      const { data } = await apiClient.patch<Account>(`/accounts/${id}`, dto);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      toast.success('Cuenta actualizada.');
    },
  });
}
