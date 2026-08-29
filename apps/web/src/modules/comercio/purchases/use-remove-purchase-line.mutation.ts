import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { toast } from '@/lib/toast';
import { purchaseDetailKey } from './use-purchase.query';

export function useRemovePurchaseLineMutation(purchaseId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (lineId: string) => {
      await apiClient.delete(`/purchases/${purchaseId}/lines/${lineId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: purchaseDetailKey(purchaseId) });
      toast.success('Línea eliminada.');
    },
  });
}
