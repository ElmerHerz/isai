import { useMemo, useState } from 'react';
import type { MonthlyTrendRow } from '@isai/shared-types';
import { useIsDarkMode } from '@/lib/theme-store';

// Paleta categórica validada (skill dataviz/references/palette.md) — orden
// fijo, nunca ciclado por rango: slot 1/2/3 (azul/naranja/aqua) es el trío
// que pasa el chequeo de pares adyacentes en claro Y oscuro para barras
// apiladas (peor ΔE CVD 9.1 claro / 8.4 oscuro, sobre el piso de 8).
const SLOT_LIGHT = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4'];
const SLOT_DARK = ['#3987e5', '#d95926', '#199e70', '#c98500', '#d55181'];

const FUND_LABELS: Record<string, string> = {
  OFRENDA: 'Ofrenda',
  DIEZMO: 'Diezmo',
  TALENTO: 'Talento',
};

const MONTH_LABELS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

function formatMoney(n: number) {
  return `$${n.toLocaleString('es-SV', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function last6Months(): string[] {
  const out: string[] = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    out.push(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`);
  }
  return out;
}

interface Props {
  rows: MonthlyTrendRow[];
}

export function MonthlyTrendChart({ rows }: Props) {
  const isDark = useIsDarkMode();
  const slots = isDark ? SLOT_DARK : SLOT_LIGHT;
  const [hover, setHover] = useState<{ month: string; code: string; value: number; x: number; y: number } | null>(null);

  const { months, fundCodes, byMonth, maxTotal } = useMemo(() => {
    const months = last6Months();
    const fundCodes: string[] = [];
    for (const r of rows) {
      if (!fundCodes.includes(r.fundCode)) fundCodes.push(r.fundCode);
    }
    // Orden estable: Ofrenda/Diezmo/Talento primero si existen, luego el resto tal como aparecen.
    const priority = ['OFRENDA', 'DIEZMO', 'TALENTO'];
    fundCodes.sort((a, b) => {
      const pa = priority.indexOf(a);
      const pb = priority.indexOf(b);
      if (pa !== -1 && pb !== -1) return pa - pb;
      if (pa !== -1) return -1;
      if (pb !== -1) return 1;
      return 0;
    });

    const byMonth = new Map<string, Map<string, number>>();
    for (const m of months) byMonth.set(m, new Map());
    for (const r of rows) {
      if (!byMonth.has(r.month)) continue;
      byMonth.get(r.month)!.set(r.fundCode, Number(r.total));
    }

    let maxTotal = 0;
    for (const m of months) {
      const total = [...(byMonth.get(m)?.values() ?? [])].reduce((a, b) => a + b, 0);
      maxTotal = Math.max(maxTotal, total);
    }

    return { months, fundCodes, byMonth, maxTotal: maxTotal || 1 };
  }, [rows]);

  if (fundCodes.length === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">Todavía no hay ofrendas/diezmos registrados.</p>;
  }

  const chartH = 220;
  const barW = 32;
  const gap = 2; // separador entre segmentos apilados (mark spec)
  const colW = 88;
  const chartW = months.length * colW;
  const axisColor = 'var(--chart-axis, #c3c2b7)';
  const gridColor = 'var(--chart-grid, #e1e0d9)';

  return (
    <div>
      {/* Leyenda — siempre presente con ≥2 series */}
      <div className="mb-3 flex flex-wrap gap-x-4 gap-y-1.5">
        {fundCodes.map((code, i) => (
          <div key={code} className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: slots[i % slots.length] }} />
            {FUND_LABELS[code] ?? code}
          </div>
        ))}
      </div>

      <div className="overflow-x-auto">
        <svg
          viewBox={`0 0 ${chartW} ${chartH + 32}`}
          width="100%"
          height={chartH + 32}
          preserveAspectRatio="none"
          role="img"
          aria-label="Tendencia mensual de ofrenda, diezmo y talento, últimos 6 meses"
          style={{ minWidth: chartW }}
        >
          {/* Líneas guía horizontales, recesivas */}
          {[0, 0.5, 1].map((f) => (
            <line
              key={f}
              x1={0}
              x2={chartW}
              y1={chartH - chartH * f}
              y2={chartH - chartH * f}
              stroke={gridColor}
              strokeWidth={1}
            />
          ))}
          {/* Línea base */}
          <line x1={0} x2={chartW} y1={chartH} y2={chartH} stroke={axisColor} strokeWidth={1} />

          {months.map((month, mi) => {
            const values = byMonth.get(month)!;
            let yCursor = chartH;
            const cx = mi * colW + colW / 2;
            let topIndex = -1;
            fundCodes.forEach((c, i) => {
              if ((values.get(c) ?? 0) > 0) topIndex = i;
            });
            return (
              <g key={month}>
                {fundCodes.map((code, ci) => {
                  const v = values.get(code) ?? 0;
                  if (v <= 0) return null;
                  const h = Math.max((v / maxTotal) * (chartH - 8), 2);
                  const y = yCursor - h;
                  yCursor = y - gap;
                  const isTop = ci === topIndex;
                  const isHovered = hover?.month === month && hover.code === code;
                  return (
                    <rect
                      key={code}
                      x={cx - barW / 2}
                      y={y}
                      width={barW}
                      height={h}
                      rx={isTop ? 4 : 0}
                      fill={slots[ci % slots.length]}
                      opacity={isHovered ? 1 : hover ? 0.55 : 1}
                      onMouseEnter={() => setHover({ month, code, value: v, x: cx, y })}
                      onMouseLeave={() => setHover(null)}
                      style={{ cursor: 'default', transition: 'opacity 120ms ease' }}
                    />
                  );
                })}
                <text x={cx} y={chartH + 18} textAnchor="middle" fontSize={11} fill="currentColor" className="text-muted-foreground">
                  {MONTH_LABELS[Number(month.slice(5, 7)) - 1]}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {hover && (
        <div
          className="pointer-events-none relative -mt-2"
          style={{ transform: `translateX(${hover.x - 60}px)` }}
        >
          <div className="w-[120px] rounded-md border bg-popover px-2 py-1 text-center text-xs shadow-md">
            <div className="font-medium text-popover-foreground">{FUND_LABELS[hover.code] ?? hover.code}</div>
            <div className="text-muted-foreground">{formatMoney(hover.value)}</div>
          </div>
        </div>
      )}
    </div>
  );
}
