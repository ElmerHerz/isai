// Escape mínimo RFC 4180 — comillas dobles alrededor de la celda si trae
// coma, comilla o salto de línea, duplicando comillas internas.
function escapeCsvCell(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function toCsv(headers: string[], rows: string[][]): string {
  const lines = [headers, ...rows].map((row) => row.map(escapeCsvCell).join(','));
  return lines.join('\r\n') + '\r\n';
}
