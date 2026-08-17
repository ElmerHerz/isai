import { useMutation } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { useInstitutionsQuery } from '@/modules/general';
import type { ImportPreviewRow } from '@isai/shared-types';

export interface PreviewPersonsImportInput {
  file: File;
  institutionId: string;
  branchId?: string;
}

// No invalida ninguna query ni muestra toast de éxito — no escribe nada en
// la base, es solo una previsualización (ver PersonsService.previewImport).
export function usePreviewPersonsImportMutation() {
  // Mismo motivo que las demás mutations de Persona: necesita ?tenantId=
  // para un superadmin (Person tiene tenant_id propio).
  const { data: institutions } = useInstitutionsQuery();

  return useMutation({
    mutationFn: async ({ file, institutionId, branchId }: PreviewPersonsImportInput) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('institutionId', institutionId);
      if (branchId) formData.append('branchId', branchId);

      const tenantId = institutions?.find((i) => i.id === institutionId)?.tenantId;
      const { data } = await apiClient.post<ImportPreviewRow[]>('/persons/import/preview', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        params: tenantId ? { tenantId } : undefined,
      });
      return data;
    },
  });
}
