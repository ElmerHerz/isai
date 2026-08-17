/**
 * Extrae "HH:mm" de un datetime ISO con fecha de referencia 1970-01-01 (así
 * es como viaja una columna @db.Time — ver toTimeDate en events.service.ts /
 * branch-schedules.service.ts). Simple slice, sin pasar por Date: evita el
 * mismo tipo de corrimiento de zona horaria que formatDate() ya evita para
 * fechas.
 */
export function toTimeInputValue(value?: string | null): string {
  if (!value) return '';
  return value.slice(11, 16);
}
