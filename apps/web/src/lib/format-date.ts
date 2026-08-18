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

/**
 * "Hoy" en formato yyyy-mm-dd, en la zona horaria LOCAL del navegador —
 * para precargar un <input type="date">/DateInput con la fecha de hoy.
 *
 * NO usar `new Date().toISOString().slice(0, 10)` para esto: toISOString()
 * da la fecha en UTC, no la local — entre las 6pm y medianoche hora de El
 * Salvador (UTC-6), eso precarga el día SIGUIENTE. Hallazgo de auditoría de
 * sesión (apareció repetido en 5 diálogos distintos) — usar este helper en
 * cualquier lugar nuevo que necesite "hoy" como valor de fecha.
 */
export function todayLocalDateInput(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Diferencia en días de CALENDARIO (no de milisegundos/horas) entre hoy
 * (local) y una fecha ISO yyyy-mm-dd — positivo = en el futuro, negativo =
 * ya pasó. Comparar epoch millis directo (`new Date(target).getTime() -
 * Date.now()`) mezcla una fecha-only en UTC con un instante real, corriendo
 * el resultado hasta un día para cualquiera al oeste de UTC — mismo tipo de
 * bug que todayLocalDateInput().
 */
export function daysUntilLocal(targetIso: string): number | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(targetIso);
  if (!match) return null;
  const [, year, month, day] = match;
  const target = new Date(Number(year), Number(month) - 1, Number(day));
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}
