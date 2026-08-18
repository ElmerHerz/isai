import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { toast } from '@/lib/toast';
import { groupFundBalanceKey } from './use-group-fund-balance.query';
import { groupFundMovementsKey } from './use-group-fund-movements.query';

export interface CreateGroupFundMovementInput {
  type: 'income' | 'expense';
  accountId: string;
  amount: number;
  movementDate: string;
  branchId?: string;
  notes?: string;
}

export function useCreateGroupFundMovementMutation(groupId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (dto: CreateGroupFundMovementInput) => {
      const { data } = await apiClient.post(`/groups/${groupId}/fund-movements`, dto);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: groupFundBalanceKey(groupId) });
      queryClient.invalidateQueries({ queryKey: groupFundMovementsKey(groupId) });
      toast.success('Movimiento registrado.');
    },
  });
}
