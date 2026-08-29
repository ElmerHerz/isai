import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { toast, getErrorMessage } from '@/lib/toast';
import type { Asset } from '@isai/shared-types';
import { assetsQueryKey } from './use-assets.query';

export interface CreateAssetInput {
  institutionId: string;
  branchId?: string;
  name: string;
  categoryCode?: string;
  quantity?: number;
  serialNumber?: string;
  acquisitionDate?: string;
  acquisitionCost?: number;
  location?: string;
  sourceType?: 'project_expense' | 'group_fund_expense';
  sourceId?: string;
  notes?: string;
}

export function useCreateAssetMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (dto: CreateAssetInput) => {
      const { data } = await apiClient.post<Asset>('/assets', dto);
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: assetsQueryKey(data.institutionId) });
      toast.success('Activo creado.');
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'No se pudo crear el activo.'));
    },
  });
}
