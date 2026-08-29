import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { toast } from '@/lib/toast';
import type { Supplier } from '@isai/shared-types';
import { suppliersQueryKey } from './use-suppliers.query';

export interface UpdateSupplierInput {
  name?: string;
  taxId?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  notes?: string | null;
  isActive?: boolean;
}

export function useUpdateSupplierMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, dto }: { id: string; dto: UpdateSupplierInput }) => {
      const { data } = await apiClient.patch<Supplier>(`/suppliers/${id}`, dto);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: suppliersQueryKey });
      toast.success('Proveedor actualizado.');
    },
  });
}
