import { useMemo, useState } from 'react';
import type { AttendanceTrendPoint } from '@isai/shared-types';
import { formatDate } from '@/lib/format-date';

const LINE_COLOR_LIGHT = '#2a78d6';
const LINE_COLOR_DARK = '#3987e5';

interface Props {
  points: AttendanceTrendPoint[];
  isDark: boolean;
}

// Un solo indicador (% de asistencia por culto) — línea de una sola serie,
// no necesita leyenda (el título ya la nombra, ver skill dataviz). El eje X
// es por ÍNDICE de evento (orden cronológico), no por fecha continua: los
// cultos no caen a intervalos regulares (dos sucursales con calendarios
// distintos, algún hueco entre semanas), así que un eje de fecha real
// comprimiría/estiraría el trazo de forma engañosa — mismo criterio que
// MonthlyTrendChart (columnas discretas), pero acá con puntos en vez de
// barras porque el "job" es tendencia, no comparar magnitudes por columna.
export function AttendanceTrendChart({ points, isDark }: Props) {
  const lineColor = isDark ? LINE_COLOR_DARK : LINE_COLOR_LIGHT;
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const sorted = useMemo(
    () => [...points].sort((a, b) => a.eventDate.localeCompare(b.eventDate)),
    [points],
  );

  if (sorted.length === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">Todavía no hay cultos con asistencia registrada.</p>;
  }

  const chartH = 220;
  // Margen izquierdo reservado para las etiquetas "0%/50%/100%" — sin esto
  // el texto se dibuja encima del propio trazo en x=0 en vez de en un
  // margen propio (bug de sesión: los ejes "no se veían").
  const marginLeft = 34;
  const padX = 12;
  const colW = Math.max(28, Math.min(56, 900 / sorted.length));
  const plotW = Math.max(sorted.length * colW, 280);
  const chartW = marginLeft + plotW + padX;
  const gridColor = isDark ? '#2c2c2a' : '#e1e0d9';
  const axisLineColor = isDark ? '#383835' : '#c3c2b7';

  const rateOf = (p: AttendanceTrendPoint) => (p.total > 0 ? (p.present / p.total) * 100 : 0);
  const yOf = (rate: number) => chartH - (rate / 100) * (chartH - 8) - 4;
  const xOf = (i: number) => marginLeft + padX + i * colW + colW / 2;

  const pathD = sorted
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${xOf(i)} ${yOf(rateOf(p))}`)
    .join(' ');

  // Etiquetas de fecha dispersas — mostrar las 50+ fechas sería ilegible;
  // se muestran ~6 repartidas a lo largo del eje, siempre incluyendo la
  // primera y la última.
  const labelEvery = Math.max(1, Math.ceil(sorted.length / 6));
  const hovered = hoverIndex !== null ? sorted[hoverIndex] : null;

  return (
    <div>
      <div className="overflow-x-auto">
        <svg
          width={chartW}
          height={chartH + 32}
          role="img"
          aria-label="Porcentaje de asistencia (Presente) por culto, en orden cronológico"
          className="min-w-full"
        >
          {[0, 0.5, 1].map((f) => (
            <g key={f}>
              <line x1={marginLeft} x2={chartW} y1={chartH * (1 - f)} y2={chartH * (1 - f)} stroke={gridColor} strokeWidth={1} />
              <text
                x={marginLeft - 6}
                y={chartH * (1 - f) + 3}
                textAnchor="end"
                fontSize={10}
                fill="currentColor"
                className="text-muted-foreground"
              >
                {Math.round(f * 100)}%
              </text>
            </g>
          ))}
          <line x1={marginLeft} x2={chartW} y1={chartH} y2={chartH} stroke={axisLineColor} strokeWidth={1} />

          <path d={pathD} fill="none" stroke={lineColor} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />

          {sorted.map((p, i) => {
            const cx = xOf(i);
            const cy = yOf(rateOf(p));
            const showLabel = i === 0 || i === sorted.length - 1 || i % labelEvery === 0;
            return (
              <g key={p.eventId}>
                {/* Hit target invisible más grande que el punto visible (≥8px). */}
                <circle
                  cx={cx}
                  cy={cy}
                  r={10}
                  fill="transparent"
                  onMouseEnter={() => setHoverIndex(i)}
                  onMouseLeave={() => setHoverIndex((cur) => (cur === i ? null : cur))}
                  style={{ cursor: 'default' }}
                />
                <circle
                  cx={cx}
                  cy={cy}
                  r={hoverIndex === i ? 4.5 : 3}
                  fill={lineColor}
                  stroke={isDark ? '#1a1a19' : '#fcfcfb'}
                  strokeWidth={1.5}
                  style={{ transition: 'r 100ms ease', pointerEvents: 'none' }}
                />
                {showLabel && (
                  <text
                    x={cx}
                    y={chartH + 18}
                    textAnchor="middle"
                    fontSize={10}
                    fill="currentColor"
                    className="text-muted-foreground"
                  >
                    {formatDate(p.eventDate).slice(0, 5)}
                  </text>
                )}
                {hoverIndex === i && (
                  <line x1={cx} x2={cx} y1={0} y2={chartH} stroke={axisLineColor} strokeWidth={1} strokeDasharray="3,3" />
                )}
              </g>
            );
          })}
        </svg>
      </div>

      {hovered && (
        <div className="mt-2 rounded-lg border bg-popover p-3 text-sm shadow-sm">
          <p className="font-medium text-popover-foreground">{hovered.title} · {formatDate(hovered.eventDate)}</p>
          <p className="mt-1 text-muted-foreground">
            {rateOf(hovered).toFixed(0)}% de asistencia — {hovered.present} presente
            {hovered.late > 0 && `, ${hovered.late} tarde`}
            {hovered.absent > 0 && `, ${hovered.absent} ausente`}
            {hovered.excused > 0 && `, ${hovered.excused} justificado`}
            {' '}(de {hovered.total} registrados)
          </p>
        </div>
      )}
    </div>
  );
}
