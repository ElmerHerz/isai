import { useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { toast, getErrorMessage } from '@/lib/toast';

// Mismo patrón que useDownloadDonorStatementPdf — no es una mutation de
// react-query (no hay estado de servidor que invalidar), solo dispara la
// descarga del blob. responseType: 'blob' obligatorio, es un PDF binario.
export function useDownloadSaleInvoicePdf() {
  const [isDownloading, setIsDownloading] = useState(false);

  const download = async (saleId: string, documentNumber: string) => {
    setIsDownloading(true);
    try {
      const { data } = await apiClient.get(`/sales/${saleId}/pdf`, { responseType: 'blob' });
      const url = URL.createObjectURL(data as Blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${documentNumber}.pdf`;
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
