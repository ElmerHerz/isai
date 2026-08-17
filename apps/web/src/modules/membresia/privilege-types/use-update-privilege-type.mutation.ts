import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { toast } from '@/lib/toast';
import type { PrivilegeType } from '@isai/shared-types';

export interface UpdatePrivilegeTypeInput {
  name?: string;
  isActive?: boolean;
}

export function useUpdatePrivilegeTypeMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, dto }: { id: string; dto: UpdatePrivilegeTypeInput }) => {
      const { data } = await apiClient.patch<PrivilegeType>(`/privilege-types/${id}`, dto);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['privilege-types'] });
      toast.success('Tipo de privilegio actualizado.');
    },
  });
}
