import { useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { toast, getErrorMessage } from '@/lib/toast';

// Mismo patrón que useExportProjectSummary (Excel) — hermano en PDF, mismo
// nivel de detalle, formato propio.
export function useExportProjectSummaryPdf(projectId: string, projectName: string) {
  const [isDownloading, setIsDownloading] = useState(false);

  const download = async () => {
    setIsDownloading(true);
    try {
      const { data } = await apiClient.get(`/projects/${projectId}/export/pdf`, { responseType: 'blob' });
      const url = URL.createObjectURL(data as Blob);
      const safeName = Array.from(projectName.normalize('NFD'))
        .filter((ch) => {
          const code = ch.codePointAt(0) ?? 0;
          return code < 0x0300 || code > 0x036f;
        })
        .join('')
        .replace(/[^\w]+/g, '-');
      const a = document.createElement('a');
      a.href = url;
      a.download = `proyecto-${safeName}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      toast.error(getErrorMessage(error, 'No se pudo descargar el PDF.'));
    } finally {
      setIsDownloading(false);
    }
  };

  return { download, isDownloading };
}
