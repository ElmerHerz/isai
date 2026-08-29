import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { toast } from '@/lib/toast';
import { purchasesQueryKey } from './use-purchases.query';

export function useRemovePurchaseMutation(institutionId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/purchases/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: purchasesQueryKey(institutionId) });
      toast.success('Compra eliminada.');
    },
  });
}
