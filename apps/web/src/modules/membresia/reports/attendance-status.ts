import { CheckCircle2, Clock, FileCheck2, XCircle } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export type AttendanceStatusKey = 'present' | 'late' | 'absent' | 'excused';

// Colores de ESTADO (skill dataviz/references/palette.md "Status palette
// (fixed — never themed)"), no categóricos — por diseño no pasan el chequeo
// de separación CVD como si fueran una serie categórica (rojo/verde es el
// par clásico de confusión en daltonismo), así que la mitigación obligatoria
// es la que ya aplica el skill: ícono + etiqueta SIEMPRE junto al color,
// nunca el color solo. "excused" no es parte de la escala buena→mala del
// skill (una falta justificada no es "grave"), así que usa el tono "muted"
// neutro del mismo skill en vez de inventar un quinto rol de severidad.
export const ATTENDANCE_STATUS_META: Record<AttendanceStatusKey, { label: string; color: string; icon: LucideIcon }> = {
  present: { label: 'Presente', color: '#0ca30c', icon: CheckCircle2 },
  late: { label: 'Tarde', color: '#fab219', icon: Clock },
  absent: { label: 'Ausente', color: '#d03b3b', icon: XCircle },
  excused: { label: 'Justificado', color: '#898781', icon: FileCheck2 },
};

export const ATTENDANCE_STATUS_ORDER: AttendanceStatusKey[] = ['present', 'late', 'absent', 'excused'];
