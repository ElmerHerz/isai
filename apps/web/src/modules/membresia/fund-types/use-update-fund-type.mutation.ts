import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { toast } from '@/lib/toast';
import type { FundType } from '@isai/shared-types';

export interface UpdateFundTypeInput {
  name?: string;
  isActive?: boolean;
}

export function useUpdateFundTypeMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, dto }: { id: string; dto: UpdateFundTypeInput }) => {
      const { data } = await apiClient.patch<FundType>(`/fund-types/${id}`, dto);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fund-types'] });
      toast.success('Tipo de fondo actualizado.');
    },
  });
}
