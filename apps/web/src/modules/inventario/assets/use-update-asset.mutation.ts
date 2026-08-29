import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { toast, getErrorMessage } from '@/lib/toast';
import type { Asset } from '@isai/shared-types';
import { assetsQueryKey } from './use-assets.query';
import { assetDetailKey } from './use-asset.query';

export interface UpdateAssetInput {
  name?: string;
  categoryCode?: string | null;
  quantity?: number;
  serialNumber?: string | null;
  acquisitionDate?: string | null;
  acquisitionCost?: number | null;
  sourceType?: 'project_expense' | 'group_fund_expense' | null;
  sourceId?: string | null;
  notes?: string | null;
  isActive?: boolean;
}

export function useUpdateAssetMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, dto }: { id: string; dto: UpdateAssetInput }) => {
      const { data } = await apiClient.patch<Asset>(`/assets/${id}`, dto);
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: assetsQueryKey(data.institutionId) });
      queryClient.invalidateQueries({ queryKey: assetDetailKey(data.id) });
      toast.success('Activo actualizado.');
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'No se pudo actualizar el activo.'));
    },
  });
}
