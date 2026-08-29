import { useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { toast, getErrorMessage } from '@/lib/toast';

// Mismo patrón blob que use-download-donor-statement-pdf.ts.
export function useExportEntriesCsv() {
  const [isDownloading, setIsDownloading] = useState(false);

  const download = async (startDate: string, endDate: string) => {
    setIsDownloading(true);
    try {
      const { data } = await apiClient.get('/reports/entries-csv', {
        params: { startDate, endDate },
        responseType: 'blob',
      });
      const url = URL.createObjectURL(data as Blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `asientos-${startDate}-a-${endDate}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      toast.error(getErrorMessage(error, 'No se pudo descargar el CSV.'));
    } finally {
      setIsDownloading(false);
    }
  };

  return { download, isDownloading };
}
