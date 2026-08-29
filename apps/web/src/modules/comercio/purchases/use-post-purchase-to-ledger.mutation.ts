import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { toast } from '@/lib/toast';
import type { Purchase } from '@isai/shared-types';
import { purchaseDetailKey } from './use-purchase.query';
import { purchasesQueryKey } from './use-purchases.query';

export function usePostPurchaseToLedgerMutation(purchaseId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { data } = await apiClient.post<Purchase>(`/purchases/${purchaseId}/post-to-ledger`);
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: purchaseDetailKey(purchaseId) });
      queryClient.invalidateQueries({ queryKey: purchasesQueryKey(data.institutionId) });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['journal-entries'] });
      queryClient.invalidateQueries({ queryKey: ['product-stock'] });
      toast.success('Compra contabilizada.');
    },
  });
}
