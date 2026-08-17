/**
 * Formatea una fecha (string ISO de una columna @db.Date, ej.
 * "2026-01-01T00:00:00.000Z") como dd/MM/yyyy — formato estándar en toda la
 * app.
 *
 * Parsea los dígitos directo del string en vez de `new Date(value).toLocaleDateString()`:
 * ese approach reinterpreta la medianoche UTC en la zona horaria LOCAL del
 * navegador, corriendo la fecha un día hacia atrás para cualquiera al oeste
 * de UTC (El Salvador incluido) — mismo tipo de bug que ya se evitó con
 * Date.UTC() explícito al guardar horas (ver branch-schedules.service.ts).
 */
export function formatDate(value?: string | null): string {
  if (!value) return '—';
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!match) return '—';
  const [, year, month, day] = match;
  return `${day}/${month}/${year}`;
}
