import { useMemo, useState } from 'react';
import { createFileRoute, Link } from '@tanstack/react-router';
import { motion, type Variants } from 'framer-motion';
import {
  AlertTriangle,
  ArrowLeft,
  Ban,
  Calendar,
  Check,
  CheckCircle2,
  CircleDollarSign,
  Clock,
  Download,
  Flag,
  Gauge,
  Handshake,
  Landmark,
  MapPin,
  Pencil,
  PiggyBank,
  Plus,
  Receipt,
  Target,
  Trash2,
  TrendingDown,
  TrendingUp,
  Users,
  Wallet,
  type LucideIcon,
} from 'lucide-react';
import {
  useProjectQuery,
  useProjectContributionsQuery,
  useRemoveProjectContributionMutation,
  usePostProjectContributionToLedgerMutation,
  useProjectPledgesQuery,
  useRemoveProjectPledgeMutation,
  useProjectExpensesQuery,
  useRemoveProjectExpenseMutation,
  usePostProjectExpenseToLedgerMutation,
  useApproveProjectExpenseMutation,
  useRejectProjectExpenseMutation,
  useRegisterContributionReceiptMutation,
  useDownloadContributionReceiptPdf,
} from '@/modules/proyectos';
import { ProjectFormDialog } from '@/modules/proyectos/projects/components/project-form-dialog';
import { AddContributionDialog } from '@/modules/proyectos/projects/components/add-contribution-dialog';
import { AddPledgeDialog } from '@/modules/proyectos/projects/components/add-pledge-dialog';
import { AddExpenseDialog } from '@/modules/proyectos/projects/components/add-expense-dialog';
import { useExportProjectSummary } from '@/modules/proyectos/projects/use-export-project-summary';
import { useExportProjectSummaryPdf } from '@/modules/proyectos/projects/use-export-project-summary-pdf';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { QueryErrorState } from '@/components/ui/query-error-state';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { CollapsibleSection } from '@/components/ui/collapsible-section';
import { PageHeader } from '@/components/layout/page-header';
import { formatDate, daysUntilLocal } from '@/lib/format-date';
import { cn } from '@/lib/utils';
import type { ProjectContribution, ProjectExpense, ProjectPledge } from '@isai/shared-types';

export const Route = createFileRoute('/_authenticated/finance/projects/$projectId')({
  component: ProjectDetailPage,
});

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' } },
};

function formatAmount(amount: string | number) {
  return `$${Number(amount).toFixed(2)}`;
}

function contributorLabel(contribution: ProjectContribution) {
  if (contribution.person) return `${contribution.person.firstName} ${contribution.person.lastName}`;
  if (contribution.group) return `Grupo: ${contribution.group.name}`;
  return '—';
}

const PLEDGE_FREQUENCY_LABELS: Record<ProjectPledge['frequency'], string> = {
  once: 'Única vez',
  monthly: 'Mensual',
  weekly: 'Semanal',
};

function pledgeLabel(pledge: ProjectPledge) {
  if (pledge.person) return `${pledge.person.firstName} ${pledge.person.lastName}`;
  if (pledge.group) return `Grupo: ${pledge.group.name}`;
  return '—';
}

function expenseLabel(expense: ProjectExpense) {
  return `${expense.account.code} · ${expense.account.name}`;
}

type StatTone = 'emerald' | 'amber' | 'blue' | 'slate' | 'violet' | 'rose';

const STAT_TONE_CLASSES: Record<StatTone, string> = {
  emerald: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400',
  amber: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400',
  blue: 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400',
  slate: 'bg-slate-100 text-slate-700 dark:bg-slate-800/60 dark:text-slate-300',
  violet: 'bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-400',
  rose: 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400',
};

// Grid, no flex-wrap — con flex-wrap + min-w-0 el navegador prefiere achicar
// cada item hasta cortar el texto en vez de saltar de línea (evidente en
// pantallas angostas de verdad, ej. LG Optimus L70 ~320px). Un grid con
// columnas fijas no tiene esa ambigüedad. Mismo criterio de "grid en móvil,
// flex en desktop" que ya usan events/$eventId.tsx y person-detail-content.tsx.
function StatTile({ icon: Icon, label, value, tone }: { icon: LucideIcon; label: string; value: string; tone: StatTone }) {
  return (
    <div className={cn('min-w-0 rounded-xl p-3', STAT_TONE_CLASSES[tone])}>
      <div className="flex items-center gap-1.5 text-xs font-medium opacity-80">
        <Icon className="h-3.5 w-3.5 shrink-0" />
        <span className="truncate">{label}</span>
      </div>
      <p className="mt-1 truncate text-lg font-bold sm:text-xl">{value}</p>
    </div>
  );
}

// --- Tab de estadísticas -----------------------------------------------------

const MONTH_LABELS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

interface ProjectStatsTabProps {
  project: { id: string; name: string; goalAmount: string; targetDate?: string | null; createdAt: string; totalContributed: string };
  contributions?: ProjectContribution[];
  expenses?: ProjectExpense[];
}

// Meses de calendario completos entre dos fechas (no días/30) -- para
// "meses transcurridos"/"meses restantes" un mes de 28 días y uno de 31
// deben contar como "1 mes" por igual.
function monthsBetween(from: Date, to: Date): number {
  return (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth());
}

// Ancla siempre al día 1 vía el constructor numérico (año, mes, día) --
// nunca setMonth() sobre una fecha con día 29-31, porque en un mes con
// menos días eso hace que Date haga overflow y salte un mes entero (ej.
// 31 de agosto + 1 mes = 31 de septiembre, que no existe -> 1 de octubre).
function addMonths(date: Date, months: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + Math.ceil(months), 1);
}

// "YYYY-MM" -> Date del día 1 de ese mes, en hora LOCAL (constructor
// numérico, no parseo de string) -- new Date('YYYY-MM-01') se interpreta
// como medianoche UTC, que en cualquier huso horario detrás de UTC (ej.
// Centroamérica, UTC-6) cae la noche del último día del mes ANTERIOR en
// hora local, corriendo todos los cálculos un mes hacia atrás.
function monthKeyToDate(monthKey: string): Date {
  const [year, month] = monthKey.split('-').map(Number);
  return new Date(year!, month! - 1, 1);
}

function ProjectStatsTab({ project, contributions, expenses }: ProjectStatsTabProps) {
  const { download, isDownloading } = useExportProjectSummary(project.id, project.name);
  const { download: downloadPdf, isDownloading: isDownloadingPdf } = useExportProjectSummaryPdf(project.id, project.name);

  const stats = useMemo(() => {
    if (!contributions || !expenses) return null;

    const byContributor = new Map<string, { label: string; total: number; count: number }>();
    for (const c of contributions) {
      const key = c.personId ?? (c.groupId ? `g:${c.groupId}` : 'anon');
      const entry = byContributor.get(key) ?? { label: contributorLabel(c), total: 0, count: 0 };
      entry.total += Number(c.amount);
      entry.count += 1;
      byContributor.set(key, entry);
    }
    const topContributors = [...byContributor.values()].sort((a, b) => b.total - a.total).slice(0, 5);

    const postedContributions = contributions.filter((c) => c.journalEntryId).length;
    const postedExpenses = expenses.filter((e) => e.journalEntryId).length;
    const totalContributed = contributions.reduce((sum, c) => sum + Number(c.amount), 0);

    const byMonth = new Map<string, number>();
    for (const c of contributions) {
      const month = c.contributedAt.slice(0, 7);
      byMonth.set(month, (byMonth.get(month) ?? 0) + Number(c.amount));
    }
    const monthly = [...byMonth.entries()].sort(([a], [b]) => a.localeCompare(b));

    return {
      distinctContributors: byContributor.size,
      avgContribution: contributions.length > 0 ? totalContributed / contributions.length : 0,
      postedContributions,
      pendingContributions: contributions.length - postedContributions,
      postedExpenses,
      pendingExpenses: expenses.length - postedExpenses,
      topContributors,
      monthly,
    };
  }, [contributions, expenses]);

  // Proyección: a partir del ritmo real desde que arrancó el proyecto
  // (recaudado / meses transcurridos), estima cuándo se alcanzaría la meta
  // si se sigue aportando a ese mismo ritmo, y si eso llega a tiempo para
  // la fecha objetivo. "Aporte mínimo necesario" es lo contrario: dado lo
  // que falta y los meses que quedan hasta la fecha objetivo, cuánto habría
  // que aportar por mes para llegar justo a la meta.
  const projection = useMemo(() => {
    if (!stats) return null;
    const goalAmount = Number(project.goalAmount);
    const totalContributed = Number(project.totalContributed);
    const remaining = Math.max(0, goalAmount - totalContributed);
    // startMonth vía .slice(0,7) del string, nunca new Date(project.createdAt)
    // + getFullYear()/getMonth() -- createdAt llega como ISO con hora, y
    // leerlo en hora local puede correr el mes si el huso horario del
    // navegador está detrás de UTC (mismo motivo que en las demás fechas
    // de este archivo). El día 1 de ese mes es la base de todo el cálculo
    // de meses transcurridos/restantes.
    const now = new Date();
    const nowMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startMonth = monthKeyToDate(project.createdAt.slice(0, 7));
    const monthIndexOf = (monthKey: string) => monthsBetween(startMonth, monthKeyToDate(monthKey));

    const monthsElapsed = Math.max(1, monthsBetween(startMonth, nowMonth) + 1);
    const monthlyRate = totalContributed / monthsElapsed;
    const monthsToGoal = monthlyRate > 0 ? remaining / monthlyRate : null;
    const estimatedDate = remaining <= 0 ? now : monthsToGoal !== null ? addMonths(now, monthsToGoal) : null;

    let monthsUntilTarget: number | null = null;
    let minMonthlyNeeded: number | null = null;
    let onTrack: boolean | null = null;
    if (project.targetDate) {
      const targetMonth = monthKeyToDate(project.targetDate.slice(0, 7));
      monthsUntilTarget = Math.max(0, monthsBetween(nowMonth, targetMonth));
      minMonthlyNeeded = remaining <= 0 ? 0 : monthsUntilTarget > 0 ? remaining / monthsUntilTarget : remaining;
      onTrack = remaining <= 0 ? true : estimatedDate !== null ? estimatedDate <= targetMonth : false;
    }

    let running = 0;
    const actual: TrendPoint[] = stats.monthly.map(([month, amount]) => {
      running += amount;
      return { month, monthIndex: monthIndexOf(month), cumulative: running, pct: goalAmount > 0 ? running / goalAmount : 0 };
    });

    // .slice(0,7) sobre el string, no parseo+lectura local del ISO completo
    // -- mismo motivo que en las demás fechas: evita el corrimiento de un
    // día (y a veces de mes) al leer una fecha UTC en hora local detrás de
    // UTC.
    const targetMonthIndex = project.targetDate ? monthIndexOf(project.targetDate.slice(0, 7)) : null;

    const projected: TrendPoint[] = [];
    if (monthlyRate > 0 && goalAmount > 0) {
      let cursor = running;
      let d = stats.monthly.length > 0 ? monthKeyToDate(stats.monthly[stats.monthly.length - 1]![0]) : new Date(startMonth);
      const cap = Math.max(24, (targetMonthIndex ?? 0) + 3);
      for (let i = 0; i < cap && cursor < goalAmount; i++) {
        d = addMonths(d, 1);
        cursor += monthlyRate;
        const month = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        projected.push({ month, monthIndex: monthIndexOf(month), cumulative: cursor, pct: cursor / goalAmount });
      }
    }

    // Línea ideal: ritmo constante que llevaría exactamente al 100% en la
    // fecha objetivo -- de (mes 0, 0%) a (mes de la fecha objetivo, 100%).
    const ideal: TrendPoint[] =
      targetMonthIndex !== null && targetMonthIndex > 0
        ? [
            { month: stats.monthly[0]?.[0] ?? '', monthIndex: 0, cumulative: 0, pct: 0 },
            { month: '', monthIndex: targetMonthIndex, cumulative: goalAmount, pct: 1 },
          ]
        : [];

    return { monthlyRate, remaining, monthsUntilTarget, minMonthlyNeeded, onTrack, estimatedDate, actual, projected, ideal, targetMonthIndex };
  }, [stats, project.goalAmount, project.totalContributed, project.createdAt, project.targetDate]);

  return (
    <div className="space-y-6">
      <Card className="rounded-2xl">
        <CardContent className="flex flex-col items-start justify-between gap-3 p-5 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-sm font-semibold">Resumen estadístico</h2>
            <p className="text-xs text-muted-foreground">Aportantes, promedio, avance mensual y estado de contabilización.</p>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => void downloadPdf()} disabled={isDownloadingPdf}>
              <Download className="mr-1.5 h-4 w-4" />
              {isDownloadingPdf ? 'Generando...' : 'Descargar PDF'}
            </Button>
            <Button size="sm" onClick={() => void download()} disabled={isDownloading}>
              <Download className="mr-1.5 h-4 w-4" />
              {isDownloading ? 'Generando...' : 'Descargar Excel'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {!stats || !projection ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-xl" />
          ))}
        </div>
      ) : (
        <>
          <Card className="rounded-2xl">
            <CardContent className="p-5">
              <CollapsibleSection icon={Gauge} title="Indicadores" defaultOpen>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  <StatTile icon={Users} label="Aportantes distintos" value={String(stats.distinctContributors)} tone="blue" />
                  <StatTile icon={CircleDollarSign} label="Aporte promedio" value={formatAmount(stats.avgContribution)} tone="slate" />
                  <StatTile icon={CheckCircle2} label="Aportes contabilizados" value={String(stats.postedContributions)} tone="emerald" />
                  <StatTile icon={Clock} label="Aportes pendientes" value={String(stats.pendingContributions)} tone="amber" />
                  <StatTile icon={CheckCircle2} label="Gastos contabilizados" value={String(stats.postedExpenses)} tone="emerald" />
                  <StatTile icon={Clock} label="Gastos pendientes" value={String(stats.pendingExpenses)} tone="amber" />
                </div>
              </CollapsibleSection>
            </CardContent>
          </Card>

          <Card className="rounded-2xl">
            <CardContent className="p-5">
              <CollapsibleSection icon={TrendingUp} title="Proyección hacia la meta" defaultOpen>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <StatTile icon={Gauge} label="Ritmo mensual promedio" value={formatAmount(projection.monthlyRate)} tone="blue" />
                    <StatTile
                      icon={Calendar}
                      label="Fecha estimada de cumplimiento"
                      value={projection.estimatedDate ? formatDate(projection.estimatedDate.toISOString()) : 'Sin datos'}
                      tone="violet"
                    />
                    {project.targetDate && (
                      <StatTile
                        icon={PiggyBank}
                        label="Aporte mensual mínimo necesario"
                        value={projection.minMonthlyNeeded !== null ? formatAmount(projection.minMonthlyNeeded) : '—'}
                        tone="amber"
                      />
                    )}
                    {project.targetDate && (
                      <StatTile
                        icon={projection.onTrack ? CheckCircle2 : AlertTriangle}
                        label="¿Va a tiempo?"
                        value={projection.onTrack ? 'Sí, a tiempo' : 'No, en riesgo'}
                        tone={projection.onTrack ? 'emerald' : 'rose'}
                      />
                    )}
                  </div>

                  {project.targetDate && (
                    <div
                      className={cn(
                        'rounded-xl border p-3 text-sm',
                        projection.onTrack
                          ? 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300'
                          : 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300',
                      )}
                    >
                      {projection.remaining <= 0
                        ? '¡Meta alcanzada! Ya se recaudó el monto completo.'
                        : projection.onTrack
                          ? `A este ritmo (${formatAmount(projection.monthlyRate)}/mes) se alcanzaría la meta antes de la fecha objetivo.`
                          : `A este ritmo (${formatAmount(projection.monthlyRate)}/mes) NO se alcanzaría la meta a tiempo. Se necesitan al menos ${formatAmount(projection.minMonthlyNeeded ?? 0)}/mes para llegar a la fecha objetivo.`}
                    </div>
                  )}

                  {projection.actual.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Todavía no hay aportes registrados para proyectar.</p>
                  ) : (
                    <ProjectionLineChart
                      actual={projection.actual}
                      projected={projection.projected}
                      ideal={projection.ideal}
                      startMonth={`${new Date(project.createdAt).getFullYear()}-${String(new Date(project.createdAt).getMonth() + 1).padStart(2, '0')}`}
                    />
                  )}
                </div>
              </CollapsibleSection>
            </CardContent>
          </Card>

          <Card className="rounded-2xl">
            <CardContent className="p-5">
              <CollapsibleSection icon={TrendingUp} title="Aportes por mes" defaultOpen={false}>
                {stats.monthly.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Todavía no hay aportes registrados.</p>
                ) : (
                  <MonthlyContributionsBars monthly={stats.monthly} />
                )}
              </CollapsibleSection>
            </CardContent>
          </Card>

          <Card className="rounded-2xl">
            <CardContent className="p-5">
              <CollapsibleSection icon={Users} title="Top aportantes" defaultOpen={false}>
                {stats.topContributors.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Todavía no hay aportes registrados.</p>
                ) : (
                  <ul className="space-y-2">
                    {stats.topContributors.map((c, i) => (
                      <li key={i} className="flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm">
                        <span className="min-w-0 truncate">{c.label}</span>
                        <span className="shrink-0 text-muted-foreground">
                          {c.count} {c.count === 1 ? 'aporte' : 'aportes'} · <span className="font-medium text-foreground">{formatAmount(c.total)}</span>
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </CollapsibleSection>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

interface TrendPoint {
  month: string;
  monthIndex: number;
  cumulative: number;
  pct: number;
}

function monthIndexLabel(startMonth: string, index: number): string {
  const d = addMonths(monthKeyToDate(startMonth), index);
  const yy = String(d.getFullYear()).slice(2);
  return `${MONTH_LABELS[d.getMonth()]} '${yy}`;
}

// Línea de % de la meta acumulado, con tres series sobre el mismo eje X
// numérico (meses desde que arrancó el proyecto, no posición en un
// arreglo -- así real/proyectado/ideal quedan alineados de verdad así
// tengan distinta cantidad de puntos):
//   - Real (sólida): lo que ya se aportó, mes a mes.
//   - Proyectado (punteada, mismo azul): continúa al ritmo promedio actual.
//   - Ideal (punteada gris): ritmo constante que llevaría exacto al 100%
//     en la fecha objetivo -- la vara con la que se compara si "vamos
//     bien" o no.
// Eje Y con porcentaje real (0%..100%+) y eje X con TODOS los meses del
// rango (con año, para no confundir si cruza a otro año), no solo cada
// N puntos -- por eso el ancho del SVG crece con la cantidad de meses en
// vez de mantenerse fijo.
function ProjectionLineChart({
  actual,
  projected,
  ideal,
  startMonth,
}: {
  actual: TrendPoint[];
  projected: TrendPoint[];
  ideal: TrendPoint[];
  startMonth: string;
}) {
  const [hover, setHover] = useState<{ point: TrendPoint; x: number; y: number; projected: boolean } | null>(null);

  const all = [...actual, ...projected, ...ideal];
  const maxIndex = Math.max(...all.map((p) => p.monthIndex), 1);
  const maxPct = Math.max(...all.map((p) => p.pct), 1);
  const yMax = Math.max(1.1, maxPct * 1.15);

  const chartH = 200;
  const padTop = 14;
  const padBottom = 22;
  const padL = 44; // espacio para las etiquetas del eje Y
  const padR = 46; // espacio para que "Meta" no se corte a la derecha
  const monthStep = 42;
  const chartW = Math.max(360, padL + padR + maxIndex * monthStep);
  const plotH = chartH - padTop - padBottom;

  const xFor = (monthIndex: number) => padL + (monthIndex / maxIndex) * (chartW - padL - padR);
  const yFor = (pct: number) => padTop + plotH - (pct / yMax) * plotH;

  const actualPts = actual.map((p) => ({ ...p, x: xFor(p.monthIndex), y: yFor(p.pct) }));
  const projectedPts = projected.map((p) => ({ ...p, x: xFor(p.monthIndex), y: yFor(p.pct) }));
  const dashedPts = actualPts.length > 0 ? [actualPts[actualPts.length - 1]!, ...projectedPts] : projectedPts;
  const idealPts = ideal.map((p) => ({ ...p, x: xFor(p.monthIndex), y: yFor(p.pct) }));

  const goalY = yFor(1);

  const targetX = ideal.length > 1 ? xFor(ideal[1]!.monthIndex) : null;

  // Marcas del eje Y: 0%, 25%, 50%, 75%, 100% y, si el rango sube más
  // (proyección o ideal por encima de la meta), un escalón más arriba.
  const yTicks: number[] = [];
  for (let t = 0; t <= yMax + 0.001; t += 0.25) yTicks.push(t);

  // Marcas del eje X: un mes por marca si el rango es corto, más
  // espaciadas si es largo -- pero siempre incluye el primer y el último
  // mes visible, para no perder los extremos.
  const xStep = maxIndex <= 8 ? 1 : maxIndex <= 16 ? 2 : maxIndex <= 30 ? 3 : Math.ceil(maxIndex / 10);
  const xTicks: number[] = [];
  for (let m = 0; m <= maxIndex; m += xStep) xTicks.push(m);
  if (xTicks[xTicks.length - 1] !== maxIndex) xTicks.push(maxIndex);

  return (
    <div className="overflow-x-auto">
      <svg
        width={chartW}
        height={chartH}
        className="mx-auto block"
        role="img"
        aria-label="Proyección de avance hacia la meta"
      >
        {/* Líneas guía horizontales + etiquetas del eje Y */}
        {yTicks.map((t) => (
          <g key={t}>
            <line x1={padL} x2={chartW - padR} y1={yFor(t)} y2={yFor(t)} stroke="#e1e0d9" strokeWidth={1} />
            <text x={padL - 6} y={yFor(t)} dy={3} textAnchor="end" fontSize={10} className="fill-muted-foreground">
              {Math.round(t * 100)}%
            </text>
          </g>
        ))}

        {/* Línea de meta (100%), más marcada que las guías normales */}
        <line x1={padL} x2={chartW - padR} y1={goalY} y2={goalY} stroke="#eda100" strokeWidth={1.5} strokeDasharray="3 3" />
        <text x={chartW - padR + 4} y={goalY} dy={3} fontSize={10} fill="#eda100">
          Meta
        </text>

        {/* Marca de fecha objetivo */}
        {targetX !== null && (
          <line x1={targetX} x2={targetX} y1={padTop} y2={padTop + plotH} stroke="#898781" strokeWidth={1} strokeDasharray="2 2" />
        )}

        {/* Ideal (punteada gris) */}
        {idealPts.length > 1 && (
          <polyline
            points={idealPts.map((p) => `${p.x},${p.y}`).join(' ')}
            fill="none"
            stroke="#898781"
            strokeWidth={1.5}
            strokeDasharray="4 3"
          />
        )}

        {/* Real (sólido) */}
        {actualPts.length > 1 && (
          <polyline points={actualPts.map((p) => `${p.x},${p.y}`).join(' ')} fill="none" stroke="#2a78d6" strokeWidth={2} />
        )}
        {/* Proyectado (punteado, mismo azul) */}
        {dashedPts.length > 1 && (
          <polyline
            points={dashedPts.map((p) => `${p.x},${p.y}`).join(' ')}
            fill="none"
            stroke="#2a78d6"
            strokeWidth={2}
            strokeDasharray="5 4"
            opacity={0.7}
          />
        )}

        {actualPts.map((p) => (
          <circle
            key={`a-${p.month}`}
            cx={p.x}
            cy={p.y}
            r={4}
            fill="#2a78d6"
            onMouseEnter={() => setHover({ point: p, x: p.x, y: p.y, projected: false })}
            onMouseLeave={() => setHover(null)}
          />
        ))}
        {projectedPts.map((p) => (
          <circle
            key={`p-${p.month}`}
            cx={p.x}
            cy={p.y}
            r={4}
            fill="#fcfcfb"
            stroke="#2a78d6"
            strokeWidth={2}
            onMouseEnter={() => setHover({ point: p, x: p.x, y: p.y, projected: true })}
            onMouseLeave={() => setHover(null)}
          />
        ))}

        {/* Eje X: etiquetas de mes + año en todas las marcas calculadas */}
        {xTicks.map((m) => (
          <text key={m} x={xFor(m)} y={chartH - 4} textAnchor="middle" fontSize={10} className="fill-muted-foreground">
            {monthIndexLabel(startMonth, m)}
          </text>
        ))}
      </svg>
      {hover && (
        <div className="mt-1 text-xs text-muted-foreground">
          {monthIndexLabel(startMonth, hover.point.monthIndex)}
          {hover.projected ? ' (proyectado)' : ''}:{' '}
          <span className="font-medium text-foreground">{formatAmount(hover.point.cumulative)}</span>{' '}
          <span className="text-muted-foreground">({(hover.point.pct * 100).toFixed(0)}% de la meta)</span>
        </div>
      )}
      <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-0.5 w-4" style={{ backgroundColor: '#2a78d6' }} /> Real
        </span>
        <span className="flex items-center gap-1.5">
          <span
            className="inline-block h-0.5 w-4"
            style={{ backgroundImage: 'repeating-linear-gradient(90deg, #2a78d6 0 4px, transparent 4px 7px)' }}
          />
          Proyectado
        </span>
        {ideal.length > 1 && (
          <span className="flex items-center gap-1.5">
            <span
              className="inline-block h-0.5 w-4"
              style={{ backgroundImage: 'repeating-linear-gradient(90deg, #898781 0 4px, transparent 4px 7px)' }}
            />
            Ideal (ritmo necesario para llegar a tiempo)
          </span>
        )}
      </p>
    </div>
  );
}

// Barra simple de una sola serie -- una serie no necesita leyenda (el
// título de la card ya la nombra), mismo criterio de marcas que el panel
// de Finanzas (extremo superior redondeado, hover con tooltip).
function MonthlyContributionsBars({ monthly }: { monthly: [string, number][] }) {
  const [hover, setHover] = useState<{ month: string; value: number } | null>(null);
  const max = Math.max(...monthly.map(([, v]) => v), 1);
  const chartH = 140;
  const colW = 64;

  return (
    <div className="overflow-x-auto">
      <svg
        width={monthly.length * colW}
        height={chartH + 28}
        className="mx-auto block"
        role="img"
        aria-label="Aportes por mes"
      >
        <line x1={0} x2={monthly.length * colW} y1={chartH} y2={chartH} stroke="#c3c2b7" strokeWidth={1} />
        {monthly.map(([month, value], i) => {
          const h = Math.max((value / max) * (chartH - 8), 2);
          const cx = i * colW + colW / 2;
          return (
            <g key={month}>
              <rect
                x={cx - 16}
                y={chartH - h}
                width={32}
                height={h}
                rx={4}
                fill="#2a78d6"
                opacity={hover && hover.month !== month ? 0.55 : 1}
                onMouseEnter={() => setHover({ month, value })}
                onMouseLeave={() => setHover(null)}
                style={{ transition: 'opacity 120ms ease' }}
              />
              <text x={cx} y={chartH + 16} textAnchor="middle" fontSize={11} className="fill-muted-foreground">
                {MONTH_LABELS[Number(month.slice(5, 7)) - 1]}
              </text>
            </g>
          );
        })}
      </svg>
      {hover && (
        <div className="mt-1 text-xs text-muted-foreground">
          {MONTH_LABELS[Number(hover.month.slice(5, 7)) - 1]}: <span className="font-medium text-foreground">{formatAmount(hover.value)}</span>
        </div>
      )}
    </div>
  );
}

function ProjectDetailPage() {
  const { projectId } = Route.useParams();
  const { data: project, isLoading, isError, refetch } = useProjectQuery(projectId);
  const {
    data: contributions,
    isLoading: isContributionsLoading,
    isError: isContributionsError,
    refetch: refetchContributions,
  } = useProjectContributionsQuery(projectId);
  const removeMutation = useRemoveProjectContributionMutation(projectId);
  const postMutation = usePostProjectContributionToLedgerMutation(projectId);
  const registerReceiptMutation = useRegisterContributionReceiptMutation(projectId);
  const { download: downloadReceiptPdf, isDownloading: isDownloadingReceipt } = useDownloadContributionReceiptPdf(projectId);
  const {
    data: pledges,
    isLoading: isPledgesLoading,
    isError: isPledgesError,
    refetch: refetchPledges,
  } = useProjectPledgesQuery(projectId);
  const removePledgeMutation = useRemoveProjectPledgeMutation(projectId);
  const {
    data: expenses,
    isLoading: isExpensesLoading,
    isError: isExpensesError,
    refetch: refetchExpenses,
  } = useProjectExpensesQuery(projectId);
  const removeExpenseMutation = useRemoveProjectExpenseMutation(projectId);
  const postExpenseMutation = usePostProjectExpenseToLedgerMutation(projectId);
  const approveExpenseMutation = useApproveProjectExpenseMutation(projectId);
  const rejectExpenseMutation = useRejectProjectExpenseMutation(projectId);

  const [editOpen, setEditOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [removingContribution, setRemovingContribution] = useState<ProjectContribution | null>(null);
  const [postingContribution, setPostingContribution] = useState<ProjectContribution | null>(null);
  const [addPledgeOpen, setAddPledgeOpen] = useState(false);
  const [removingPledge, setRemovingPledge] = useState<ProjectPledge | null>(null);
  const [addExpenseOpen, setAddExpenseOpen] = useState(false);
  const [removingExpense, setRemovingExpense] = useState<ProjectExpense | null>(null);
  const [postingExpense, setPostingExpense] = useState<ProjectExpense | null>(null);
  const [rejectingExpense, setRejectingExpense] = useState<ProjectExpense | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  if (isError) {
    return <QueryErrorState message="No se pudo cargar el proyecto." onRetry={() => refetch()} />;
  }

  if (isLoading || !project) {
    return <p className="text-muted-foreground">Cargando...</p>;
  }

  const totalContributed = Number(project.totalContributed);
  const totalSpent = Number(project.totalSpent);
  const goalAmount = Number(project.goalAmount);
  const available = totalContributed - totalSpent;
  const percent = Math.min(100, goalAmount > 0 ? (totalContributed / goalAmount) * 100 : 0);
  const remaining = Math.max(0, goalAmount - totalContributed);
  const daysRemaining = project.targetDate ? daysUntilLocal(project.targetDate) : null;

  const daysTone: StatTone = daysRemaining === null ? 'violet' : daysRemaining < 0 ? 'rose' : daysRemaining <= 7 ? 'amber' : 'violet';

  const totalPledged = Number(project.totalPledged);

  const kpis: { label: string; value: string; icon: LucideIcon; tone: StatTone }[] = [
    { label: 'Recaudado', value: formatAmount(totalContributed), icon: TrendingUp, tone: 'emerald' },
    { label: 'Prometido', value: formatAmount(totalPledged), icon: Handshake, tone: 'violet' },
    { label: 'Gastado', value: formatAmount(totalSpent), icon: TrendingDown, tone: 'amber' },
    { label: 'Disponible', value: formatAmount(available), icon: Wallet, tone: available < 0 ? 'rose' : 'blue' },
    { label: 'Meta', value: formatAmount(goalAmount), icon: Flag, tone: 'slate' },
    { label: 'Falta para la meta', value: formatAmount(remaining), icon: CircleDollarSign, tone: 'slate' },
    ...(daysRemaining !== null
      ? [{ label: 'Días restantes', value: daysRemaining >= 0 ? String(daysRemaining) : 'Vencido', icon: Clock, tone: daysTone }]
      : []),
  ];

  return (
    <div>
      <Link
        to="/finance/projects"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Proyectos
      </Link>

      <div className="mt-3">
        <PageHeader
          icon={Target}
          title={project.name}
          description={project.description ?? undefined}
        />
      </div>

      <motion.div initial="hidden" animate="show" variants={fadeUp} className="mt-6 space-y-6">
        <Card className="rounded-2xl">
          <CardContent className="p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0 flex-1 space-y-1.5">
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5 shrink-0" />
                    {project.branch.name}
                  </span>
                  {project.targetDate && (
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5 shrink-0" />
                      {formatDate(project.targetDate)}
                    </span>
                  )}
                </div>
                {!project.incomeAccount && (
                  <p className="text-xs font-medium text-amber-600 dark:text-amber-400">
                    Sin cuenta de ingreso configurada — no se puede Contabilizar todavía.
                  </p>
                )}
              </div>
              <Button variant="outline" size="sm" onClick={() => setEditOpen(true)} className="shrink-0">
                <Pencil className="mr-1.5 h-4 w-4" />
                Editar
              </Button>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              {kpis.map((kpi) => (
                <StatTile key={kpi.label} icon={kpi.icon} label={kpi.label} value={kpi.value} tone={kpi.tone} />
              ))}
            </div>

            <div className="mt-4 flex items-center gap-3">
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className={cn('h-full rounded-full transition-all', percent >= 100 ? 'bg-emerald-500' : 'bg-primary')}
                  style={{ width: `${percent}%` }}
                />
              </div>
              <span className="shrink-0 text-xs font-semibold text-muted-foreground">{percent.toFixed(0)}%</span>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="movimientos">
          <TabsList>
            <TabsTrigger value="movimientos">Aportes y gastos</TabsTrigger>
            <TabsTrigger value="estadisticas">Estadísticas</TabsTrigger>
          </TabsList>

          <TabsContent value="movimientos" className="space-y-6">
        <Card className="rounded-2xl">
          <CardContent className="p-6">
            <CollapsibleSection
              icon={Users}
              title="Aportes"
              defaultOpen
              action={
                <Button variant="outline" size="sm" onClick={() => setAddOpen(true)}>
                  <Plus className="mr-1.5 h-4 w-4" />
                  Agregar
                </Button>
              }
            >
            {isContributionsLoading && (
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full rounded-lg" />
                ))}
              </div>
            )}

            {isContributionsError && (
              <QueryErrorState message="No se pudieron cargar los aportes." onRetry={() => refetchContributions()} />
            )}

            {!isContributionsLoading && !isContributionsError && contributions?.length === 0 && (
              <p className="text-sm text-muted-foreground">Todavía no se han registrado aportes.</p>
            )}

            <ul className="space-y-2">
              {contributions?.map((contribution) => (
                <li key={contribution.id} className="flex items-center justify-between gap-2 rounded-lg border px-3 py-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{contributorLabel(contribution)}</p>
                    <p className="truncate text-xs text-muted-foreground">{formatDate(contribution.contributedAt)}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="text-sm font-medium">{formatAmount(contribution.amount)}</span>
                    {contribution.documentNumber ? (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => void downloadReceiptPdf(contribution.id, contribution.documentNumber!)}
                        disabled={isDownloadingReceipt}
                        aria-label={`Descargar comprobante ${contribution.documentNumber}`}
                        title={`Descargar comprobante ${contribution.documentNumber}`}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    ) : (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => registerReceiptMutation.mutate(contribution.id)}
                        disabled={registerReceiptMutation.isPending}
                        aria-label="Generar comprobante"
                        title="Generar comprobante"
                      >
                        <Receipt className="h-4 w-4" />
                      </Button>
                    )}
                    {contribution.journalEntryId ? (
                      <span
                        className="flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
                        title="Ya tiene asiento contable"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Contabilizado
                      </span>
                    ) : (
                      <>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setPostingContribution(contribution)}
                          aria-label="Contabilizar"
                          title="Contabilizar"
                        >
                          <Landmark className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setRemovingContribution(contribution)}
                          aria-label="Eliminar"
                          title="Eliminar"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </li>
              ))}
            </ul>
            </CollapsibleSection>
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardContent className="p-6">
            <CollapsibleSection
              icon={Handshake}
              title="Compromisos"
              defaultOpen={false}
              action={
                <Button variant="outline" size="sm" onClick={() => setAddPledgeOpen(true)}>
                  <Plus className="mr-1.5 h-4 w-4" />
                  Agregar
                </Button>
              }
            >
            {isPledgesLoading && (
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full rounded-lg" />
                ))}
              </div>
            )}

            {isPledgesError && (
              <QueryErrorState message="No se pudieron cargar los compromisos." onRetry={() => refetchPledges()} />
            )}

            {!isPledgesLoading && !isPledgesError && pledges?.length === 0 && (
              <p className="text-sm text-muted-foreground">Todavía no hay compromisos de aporte registrados.</p>
            )}

            <ul className="space-y-2">
              {pledges?.map((pledge) => (
                <li key={pledge.id} className="flex items-center justify-between gap-2 rounded-lg border px-3 py-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{pledgeLabel(pledge)}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {PLEDGE_FREQUENCY_LABELS[pledge.frequency]}
                      {pledge.expectedDate && ` · Esperado: ${formatDate(pledge.expectedDate)}`}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="text-sm font-medium">{formatAmount(pledge.amount)}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setRemovingPledge(pledge)}
                      aria-label="Eliminar"
                      title="Eliminar"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
            </CollapsibleSection>
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardContent className="p-6">
            <CollapsibleSection
              icon={Receipt}
              title="Gastos"
              defaultOpen={false}
              action={
                <Button variant="outline" size="sm" onClick={() => setAddExpenseOpen(true)}>
                  <Plus className="mr-1.5 h-4 w-4" />
                  Agregar
                </Button>
              }
            >
            {isExpensesLoading && (
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full rounded-lg" />
                ))}
              </div>
            )}

            {isExpensesError && (
              <QueryErrorState message="No se pudieron cargar los gastos." onRetry={() => refetchExpenses()} />
            )}

            {!isExpensesLoading && !isExpensesError && expenses?.length === 0 && (
              <p className="text-sm text-muted-foreground">Todavía no se han registrado gastos.</p>
            )}

            <ul className="space-y-2">
              {expenses?.map((expense) => (
                <li key={expense.id} className="flex items-center justify-between gap-2 rounded-lg border px-3 py-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{expenseLabel(expense)}</p>
                    <p className="truncate text-xs text-muted-foreground">{formatDate(expense.incurredAt)}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="text-sm font-medium">{formatAmount(expense.amount)}</span>
                    {expense.journalEntryId ? (
                      <span
                        className="flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
                        title="Ya tiene asiento contable"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Contabilizado
                      </span>
                    ) : expense.approvalStatus === 'pending' ? (
                      <>
                        <span
                          className="flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-950/40 dark:text-amber-400"
                          title={
                            expense.activeStepApprover
                              ? `Esperando aprobación de: ${expense.activeStepApprover.firstName} ${expense.activeStepApprover.lastName}`
                              : undefined
                          }
                        >
                          <Clock className="h-3.5 w-3.5" />
                          {expense.activeStepApprover
                            ? `Esperando: ${expense.activeStepApprover.firstName} ${expense.activeStepApprover.lastName}`
                            : 'Pendiente de aprobación'}
                        </span>
                        {expense.canCurrentUserApprove && (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => approveExpenseMutation.mutate(expense.id)}
                              aria-label="Aprobar"
                              title="Aprobar"
                            >
                              <Check className="h-4 w-4 text-emerald-600" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setRejectingExpense(expense)}
                              aria-label="Rechazar"
                              title="Rechazar"
                            >
                              <Ban className="h-4 w-4 text-destructive" />
                            </Button>
                          </>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setRemovingExpense(expense)}
                          aria-label="Eliminar"
                          title="Eliminar"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </>
                    ) : expense.approvalStatus === 'rejected' ? (
                      <>
                        <span className="flex items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 text-xs font-medium text-rose-700 dark:bg-rose-950/40 dark:text-rose-400">
                          <Ban className="h-3.5 w-3.5" />
                          Rechazado
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setRemovingExpense(expense)}
                          aria-label="Eliminar"
                          title="Eliminar"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setPostingExpense(expense)}
                          aria-label="Contabilizar"
                          title="Contabilizar"
                        >
                          <Landmark className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setRemovingExpense(expense)}
                          aria-label="Eliminar"
                          title="Eliminar"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </li>
              ))}
            </ul>
            </CollapsibleSection>
          </CardContent>
        </Card>
          </TabsContent>

          <TabsContent value="estadisticas">
            <ProjectStatsTab project={project} contributions={contributions} expenses={expenses} />
          </TabsContent>
        </Tabs>
      </motion.div>

      <ProjectFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        institutionId={project.institutionId}
        project={project}
      />

      <AddContributionDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        projectId={project.id}
        institutionId={project.institutionId}
      />

      <ConfirmDialog
        open={!!removingContribution}
        onOpenChange={(open) => !open && setRemovingContribution(null)}
        title="Eliminar aporte"
        description={
          removingContribution
            ? `Esto elimina el aporte de "${contributorLabel(removingContribution)}" por ${formatAmount(removingContribution.amount)}. No se puede deshacer.`
            : ''
        }
        isPending={removeMutation.isPending}
        onConfirm={() => {
          if (!removingContribution) return;
          removeMutation.mutate(removingContribution.id, { onSuccess: () => setRemovingContribution(null) });
        }}
      />

      <ConfirmDialog
        open={!!postingContribution}
        onOpenChange={(open) => !open && setPostingContribution(null)}
        title="Contabilizar aporte"
        confirmLabel="Contabilizar"
        pendingLabel="Contabilizando..."
        description={
          postingContribution
            ? `Esto genera el asiento contable del aporte de "${contributorLabel(postingContribution)}" por ${formatAmount(postingContribution.amount)} (debe Caja, haber la cuenta de ingreso del proyecto). No se puede deshacer ni volver a contabilizar el mismo aporte.`
            : ''
        }
        isPending={postMutation.isPending}
        onConfirm={() => {
          if (!postingContribution) return;
          postMutation.mutate(postingContribution.id, { onSuccess: () => setPostingContribution(null) });
        }}
      />

      <AddPledgeDialog
        open={addPledgeOpen}
        onOpenChange={setAddPledgeOpen}
        projectId={project.id}
        institutionId={project.institutionId}
      />

      <ConfirmDialog
        open={!!removingPledge}
        onOpenChange={(open) => !open && setRemovingPledge(null)}
        title="Eliminar compromiso"
        description={
          removingPledge
            ? `Esto elimina el compromiso de "${pledgeLabel(removingPledge)}" por ${formatAmount(removingPledge.amount)}. No se puede deshacer.`
            : ''
        }
        isPending={removePledgeMutation.isPending}
        onConfirm={() => {
          if (!removingPledge) return;
          removePledgeMutation.mutate(removingPledge.id, { onSuccess: () => setRemovingPledge(null) });
        }}
      />

      <AddExpenseDialog open={addExpenseOpen} onOpenChange={setAddExpenseOpen} projectId={project.id} />

      <ConfirmDialog
        open={!!removingExpense}
        onOpenChange={(open) => !open && setRemovingExpense(null)}
        title="Eliminar gasto"
        description={
          removingExpense
            ? `Esto elimina el gasto de "${expenseLabel(removingExpense)}" por ${formatAmount(removingExpense.amount)}. No se puede deshacer.`
            : ''
        }
        isPending={removeExpenseMutation.isPending}
        onConfirm={() => {
          if (!removingExpense) return;
          removeExpenseMutation.mutate(removingExpense.id, { onSuccess: () => setRemovingExpense(null) });
        }}
      />

      <ConfirmDialog
        open={!!postingExpense}
        onOpenChange={(open) => !open && setPostingExpense(null)}
        title="Contabilizar gasto"
        confirmLabel="Contabilizar"
        pendingLabel="Contabilizando..."
        description={
          postingExpense
            ? `Esto genera el asiento contable del gasto de "${expenseLabel(postingExpense)}" por ${formatAmount(postingExpense.amount)} (debe la cuenta de gasto, haber Caja). No se puede deshacer ni volver a contabilizar el mismo gasto.`
            : ''
        }
        isPending={postExpenseMutation.isPending}
        onConfirm={() => {
          if (!postingExpense) return;
          postExpenseMutation.mutate(postingExpense.id, { onSuccess: () => setPostingExpense(null) });
        }}
      />

      <Dialog
        open={!!rejectingExpense}
        onOpenChange={(open) => {
          if (!open) {
            setRejectingExpense(null);
            setRejectReason('');
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rechazar gasto</DialogTitle>
            <DialogDescription>
              {rejectingExpense && `${expenseLabel(rejectingExpense)} por ${formatAmount(rejectingExpense.amount)} — indica el motivo.`}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label htmlFor="reject-reason">Motivo</Label>
            <Input
              id="reject-reason"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              maxLength={255}
              placeholder="Ej. Falta cotización, monto no coincide..."
              autoFocus
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setRejectingExpense(null);
                setRejectReason('');
              }}
              disabled={rejectExpenseMutation.isPending}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="delete"
              disabled={rejectExpenseMutation.isPending || !rejectReason.trim()}
              onClick={() => {
                if (!rejectingExpense) return;
                rejectExpenseMutation.mutate(
                  { expenseId: rejectingExpense.id, reason: rejectReason },
                  {
                    onSuccess: () => {
                      setRejectingExpense(null);
                      setRejectReason('');
                    },
                  },
                );
              }}
            >
              {rejectExpenseMutation.isPending ? 'Rechazando...' : 'Rechazar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
