import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { toast, getErrorMessage } from '@/lib/toast';
import type { Asset } from '@isai/shared-types';
import { assetsQueryKey } from './use-assets.query';
import { assetDetailKey } from './use-asset.query';
import { assetMovementsQueryKey } from './use-asset-movements.query';

export interface RelocateAssetInput {
  location: string;
  notes: string;
}

export function useRelocateAssetMutation(assetId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (dto: RelocateAssetInput) => {
      const { data } = await apiClient.post<Asset>(`/assets/${assetId}/relocate`, dto);
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: assetsQueryKey(data.institutionId) });
      queryClient.invalidateQueries({ queryKey: assetDetailKey(assetId) });
      queryClient.invalidateQueries({ queryKey: assetMovementsQueryKey(assetId) });
      toast.success('Ubicación actualizada.');
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'No se pudo reubicar el activo.'));
    },
  });
}
