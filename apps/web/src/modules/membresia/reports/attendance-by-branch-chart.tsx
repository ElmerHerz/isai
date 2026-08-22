import { useState } from 'react';
import type { AttendanceByBranchRow } from '@isai/shared-types';
import { ATTENDANCE_STATUS_META, ATTENDANCE_STATUS_ORDER, type AttendanceStatusKey } from './attendance-status';

interface Props {
  rows: AttendanceByBranchRow[];
  isDark: boolean;
}

const KEY_TO_FIELD: Record<AttendanceStatusKey, keyof AttendanceByBranchRow> = {
  present: 'present',
  late: 'late',
  absent: 'absent',
  excused: 'excused',
};

// Barras apiladas, una por sucursal — pocas categorías (2-3 sucursales
// reales hoy), cada una con sus 4 segmentos de estado. Leyenda siempre
// presente (son 4 series) con ícono, nunca solo el color — ver
// attendance-status.ts sobre por qué estos colores no son categóricos.
export function AttendanceByBranchChart({ rows, isDark }: Props) {
  const [hover, setHover] = useState<{ branchId: string; status: AttendanceStatusKey } | null>(null);

  if (rows.length === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">Todavía no hay asistencia registrada.</p>;
  }

  const surface = isDark ? '#1a1a19' : '#fcfcfb';
  const axisColor = isDark ? '#383835' : '#c3c2b7';
  const gridColor = isDark ? '#2c2c2a' : '#2c2c2a20';
  const maxTotal = Math.max(...rows.map((r) => r.total), 1);
  const chartH = 200;
  const barW = 56;
  const colW = 120;
  const gap = 2;
  const chartW = rows.length * colW;

  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-x-4 gap-y-1.5">
        {ATTENDANCE_STATUS_ORDER.map((key) => {
          const meta = ATTENDANCE_STATUS_META[key];
          const Icon = meta.icon;
          return (
            <div key={key} className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Icon className="h-3.5 w-3.5" style={{ color: meta.color }} />
              {meta.label}
            </div>
          );
        })}
      </div>

      <div className="overflow-x-auto">
        <svg width={Math.max(chartW, 280)} height={chartH + 32} role="img" aria-label="Asistencia por sucursal, desglosada por estado">
          {[0, 0.5, 1].map((f) => (
            <line key={f} x1={0} x2={chartW} y1={chartH * (1 - f)} y2={chartH * (1 - f)} stroke={gridColor} strokeWidth={1} />
          ))}
          <line x1={0} x2={chartW} y1={chartH} y2={chartH} stroke={axisColor} strokeWidth={1} />

          {rows.map((row, ri) => {
            const cx = ri * colW + colW / 2;
            let yCursor = chartH;
            let topKey: AttendanceStatusKey | null = null;
            for (const key of ATTENDANCE_STATUS_ORDER) {
              if ((row[KEY_TO_FIELD[key]] as number) > 0) topKey = key;
            }
            return (
              <g key={row.branchId ?? 'null'}>
                {ATTENDANCE_STATUS_ORDER.map((key) => {
                  const value = row[KEY_TO_FIELD[key]] as number;
                  if (value <= 0) return null;
                  const h = Math.max((value / maxTotal) * (chartH - 8), 2);
                  const y = yCursor - h;
                  yCursor = y - gap;
                  const isHovered = hover?.branchId === (row.branchId ?? 'null') && hover.status === key;
                  const meta = ATTENDANCE_STATUS_META[key];
                  return (
                    <rect
                      key={key}
                      x={cx - barW / 2}
                      y={y}
                      width={barW}
                      height={h}
                      rx={key === topKey ? 4 : 0}
                      fill={meta.color}
                      stroke={surface}
                      strokeWidth={isHovered ? 1.5 : 0}
                      opacity={hover && !isHovered ? 0.55 : 1}
                      onMouseEnter={() => setHover({ branchId: row.branchId ?? 'null', status: key })}
                      onMouseLeave={() => setHover(null)}
                      style={{ cursor: 'default', transition: 'opacity 120ms ease' }}
                    />
                  );
                })}
                <text x={cx} y={chartH + 18} textAnchor="middle" fontSize={11} fill="currentColor" className="text-muted-foreground">
                  {row.branchName.length > 16 ? `${row.branchName.slice(0, 15)}…` : row.branchName}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {hover && (
        <div className="mt-2 inline-block rounded-lg border bg-popover px-3 py-1.5 text-xs shadow-sm">
          {(() => {
            const row = rows.find((r) => (r.branchId ?? 'null') === hover.branchId)!;
            const meta = ATTENDANCE_STATUS_META[hover.status];
            const value = row[KEY_TO_FIELD[hover.status]] as number;
            return (
              <span className="text-popover-foreground">
                {row.branchName} · {meta.label}: <span className="font-medium">{value}</span>
              </span>
            );
          })()}
        </div>
      )}
    </div>
  );
}
