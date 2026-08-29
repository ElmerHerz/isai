import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { toast } from '@/lib/toast';
import type { Supplier } from '@isai/shared-types';
import { suppliersQueryKey } from './use-suppliers.query';

export interface CreateSupplierInput {
  name: string;
  taxId?: string;
  phone?: string;
  email?: string;
  address?: string;
  notes?: string;
}

export function useCreateSupplierMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (dto: CreateSupplierInput) => {
      const { data } = await apiClient.post<Supplier>('/suppliers', dto);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: suppliersQueryKey });
      toast.success('Proveedor creado.');
    },
  });
}
