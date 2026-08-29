import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { toast } from '@/lib/toast';
import type { Customer } from '@isai/shared-types';
import { customersQueryKey } from './use-customers.query';

export interface UpdateCustomerInput {
  name?: string;
  taxId?: string | null;
  phone?: string | null;
  email?: string | null;
  notes?: string | null;
  isActive?: boolean;
}

export function useUpdateCustomerMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, dto }: { id: string; dto: UpdateCustomerInput }) => {
      const { data } = await apiClient.patch<Customer>(`/customers/${id}`, dto);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: customersQueryKey });
      toast.success('Cliente actualizado.');
    },
  });
}
