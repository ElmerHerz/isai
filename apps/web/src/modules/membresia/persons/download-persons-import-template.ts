import { apiClient } from '@/lib/api-client';

// No es un hook — se llama directo desde un onClick, dispara la descarga
// del archivo y no hay ningún estado de React que mantener.
export async function downloadPersonsImportTemplate() {
  const response = await apiClient.get('/persons/import/template', { responseType: 'blob' });
  const url = URL.createObjectURL(response.data as Blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'plantilla-personas.xlsx';
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
