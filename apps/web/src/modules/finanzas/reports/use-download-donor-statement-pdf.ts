import { useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { toast, getErrorMessage } from '@/lib/toast';

// Mismo patrón que useExportProjectSummary — no es una mutation de
// react-query (no hay estado de servidor que invalidar), solo dispara la
// descarga del blob. responseType: 'blob' obligatorio, es un PDF binario.
export function useDownloadDonorStatementPdf() {
  const [isDownloading, setIsDownloading] = useState(false);

  const download = async (personId: string, year: number, documentNumber: string) => {
    setIsDownloading(true);
    try {
      const { data } = await apiClient.get('/reports/donor-statement/pdf', {
        params: { personId, year },
        responseType: 'blob',
      });
      const url = URL.createObjectURL(data as Blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `comprobante-${documentNumber}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      toast.error(getErrorMessage(error, 'No se pudo descargar el comprobante.'));
    } finally {
      setIsDownloading(false);
    }
  };

  return { download, isDownloading };
}
