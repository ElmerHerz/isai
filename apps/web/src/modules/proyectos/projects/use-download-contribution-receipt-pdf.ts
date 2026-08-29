import { useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { toast, getErrorMessage } from '@/lib/toast';

// Mismo patrón que useExportProjectSummary/useDownloadDonorStatementPdf —
// no es una mutation de react-query, solo dispara la descarga del blob.
export function useDownloadContributionReceiptPdf(projectId: string) {
  const [isDownloading, setIsDownloading] = useState(false);

  const download = async (contributionId: string, documentNumber: string) => {
    setIsDownloading(true);
    try {
      const { data } = await apiClient.get(`/projects/${projectId}/contributions/${contributionId}/receipt/pdf`, {
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
