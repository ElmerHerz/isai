import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { toast } from '@/lib/toast';
import type { MilestoneType } from '@isai/shared-types';

export interface CreateMilestoneTypeInput {
  code: string;
  name: string;
  /** Solo para superadmin — a qué tenant pertenece el tipo de hito nuevo. */
  tenantId?: string;
}

export function useCreateMilestoneTypeMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ tenantId, ...dto }: CreateMilestoneTypeInput) => {
      const { data } = await apiClient.post<MilestoneType>('/milestone-types', dto, {
        params: tenantId ? { tenantId } : undefined,
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['milestone-types'] });
      toast.success('Tipo de hito creado.');
    },
  });
}
