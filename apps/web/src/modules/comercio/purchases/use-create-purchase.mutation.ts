import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { toast } from '@/lib/toast';
import type { Purchase } from '@isai/shared-types';
import { purchasesQueryKey } from './use-purchases.query';

export interface CreatePurchaseInput {
  institutionId: string;
  branchId: string;
  supplierId: string;
  purchaseDate: string;
  supplierDocumentNumber?: string;
  paymentMethod?: 'cash' | 'transfer' | 'credit';
  notes?: string;
}

export function useCreatePurchaseMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (dto: CreatePurchaseInput) => {
      const { data } = await apiClient.post<Purchase>('/purchases', dto);
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: purchasesQueryKey(data.institutionId) });
      toast.success('Compra registrada.');
    },
  });
}
