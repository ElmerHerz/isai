import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { toast } from '@/lib/toast';
import type { Customer } from '@isai/shared-types';
import { customersQueryKey } from './use-customers.query';

export interface CreateCustomerInput {
  name: string;
  taxId?: string;
  phone?: string;
  email?: string;
  notes?: string;
}

export function useCreateCustomerMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (dto: CreateCustomerInput) => {
      const { data } = await apiClient.post<Customer>('/customers', dto);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: customersQueryKey });
      toast.success('Cliente creado.');
    },
  });
}
