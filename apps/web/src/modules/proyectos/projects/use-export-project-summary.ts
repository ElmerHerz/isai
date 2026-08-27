import { useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { toast, getErrorMessage } from '@/lib/toast';

// No es una mutation de react-query (no hay estado de servidor que
// invalidar) -- solo dispara la descarga del blob y libera el object URL.
// responseType: 'blob' es obligatorio: axios por defecto intenta parsear
// la respuesta como JSON, y esto es un binario xlsx.
export function useExportProjectSummary(projectId: string, projectName: string) {
  const [isDownloading, setIsDownloading] = useState(false);

  const download = async () => {
    setIsDownloading(true);
    try {
      const { data } = await apiClient.get(`/projects/${projectId}/export`, { responseType: 'blob' });
      const url = URL.createObjectURL(data as Blob);
      // Quita acentos (NFD separa la letra de su marca diacrítica, código
      // 0x0300-0x036f, así que basta con filtrar esos code points) antes
      // de reducir todo lo no alfanumérico a guiones, para un nombre de
      // archivo limpio.
      const safeName = Array.from(projectName.normalize('NFD'))
        .filter((ch) => {
          const code = ch.codePointAt(0) ?? 0;
          return code < 0x0300 || code > 0x036f;
        })
        .join('')
        .replace(/[^\w]+/g, '-');
      const a = document.createElement('a');
      a.href = url;
      a.download = `proyecto-${safeName}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      toast.error(getErrorMessage(error, 'No se pudo descargar el Excel.'));
    } finally {
      setIsDownloading(false);
    }
  };

  return { download, isDownloading };
}
