import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { toast } from '@/lib/toast';
import type { ApprovalRoute } from '@isai/shared-types';
import { approvalRoutesQueryKey } from './use-approval-routes.query';

export interface UpdateApprovalRouteInput {
  minAmount?: number;
  isActive?: boolean;
}

export function useUpdateApprovalRouteMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, dto }: { id: string; dto: UpdateApprovalRouteInput }) => {
      const { data } = await apiClient.patch<ApprovalRoute>(`/approval-routes/${id}`, dto);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: approvalRoutesQueryKey });
      toast.success('Ruta de aprobación actualizada.');
    },
  });
}
