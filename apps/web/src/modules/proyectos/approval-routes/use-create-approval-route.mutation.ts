import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { toast } from '@/lib/toast';
import type { ApprovalRoute } from '@isai/shared-types';
import { approvalRoutesQueryKey } from './use-approval-routes.query';

export interface CreateApprovalRouteInput {
  name: string;
  institutionId?: string;
  branchId?: string;
  minAmount: number;
  approverUserIds: string[];
  accountIds: string[];
}

export function useCreateApprovalRouteMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (dto: CreateApprovalRouteInput) => {
      const { data } = await apiClient.post<ApprovalRoute>('/approval-routes', dto);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: approvalRoutesQueryKey });
      toast.success('Ruta de aprobación creada.');
    },
  });
}
