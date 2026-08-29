import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { toast } from '@/lib/toast';
import type { Purchase } from '@isai/shared-types';
import { purchaseDetailKey } from './use-purchase.query';

export interface AddPurchaseLineInput {
  productId: string;
  quantity: number;
  unitCost: number;
}

export function useAddPurchaseLineMutation(purchaseId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (dto: AddPurchaseLineInput) => {
      const { data } = await apiClient.post<Purchase>(`/purchases/${purchaseId}/lines`, dto);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: purchaseDetailKey(purchaseId) });
      toast.success('Línea agregada.');
    },
  });
}
