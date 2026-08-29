import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { toast } from '@/lib/toast';
import type { Sale } from '@isai/shared-types';
import { salesQueryKey } from './use-sales.query';

export interface CreateSaleLineInput {
  productId: string;
  quantity: number;
  unitPrice: number;
}

export interface CreateSaleInput {
  institutionId: string;
  branchId: string;
  customerId?: string;
  saleDate: string;
  paymentMethod: 'cash' | 'transfer' | 'card' | 'credit';
  documentType: 'invoice' | 'receipt';
  notes?: string;
  lines: CreateSaleLineInput[];
}

export function useCreateSaleMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (dto: CreateSaleInput) => {
      const { data } = await apiClient.post<Sale>('/sales', dto);
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: salesQueryKey(data.institutionId) });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['journal-entries'] });
      queryClient.invalidateQueries({ queryKey: ['product-stock'] });
      toast.success('Venta registrada.');
    },
  });
}
