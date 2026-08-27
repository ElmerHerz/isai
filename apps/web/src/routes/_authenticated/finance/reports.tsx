import { useEffect, useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { motion, type Variants } from 'framer-motion';
import { BarChart3, TrendingUp, TrendingDown, Wallet, ListTodo, LineChart, ListTree } from 'lucide-react';
import { useFundSummaryQuery, useDashboardKpisQuery, useMonthlyTrendQuery } from '@/modules/finanzas';
import { useProjectsQuery } from '@/modules/proyectos';
import { useInstitutionsQuery } from '@/modules/general';
import { MonthlyTrendChart } from '@/modules/finanzas/reports/monthly-trend-chart';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { TableSkeletonRows } from '@/components/ui/table-skeleton';
import { Skeleton } from '@/components/ui/skeleton';
import { QueryErrorState } from '@/components/ui/query-error-state';
import { Card, CardContent } from '@/components/ui/card';
import { CollapsibleSection } from '@/components/ui/collapsible-section';
import { PageHeader } from '@/components/layout/page-header';
import { useCurrentModuleColor } from '@/components/layout/use-current-module-color';
import { tintBackground, tintForeground } from '@/lib/color';
import { useIsDarkMode } from '@/lib/theme-store';
import { cn } from '@/lib/utils';
import type { Project } from '@isai/shared-types';

export const Route = createFileRoute('/_authenticated/finance/reports')({
  component: ReportsPage,
});

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' } },
};

function formatAmount(amount: string | number) {
  return `$${Number(amount).toFixed(2)}`;
}

// --- KPIs ------------------------------------------------------------------

function KpiTile({
  icon: Icon,
  label,
  value,
  loading,
  tone,
}: {
  icon: typeof TrendingUp;
  label: string;
  value: string;
  loading: boolean;
  tone?: 'good' | 'bad';
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <div
          className={cn(
            'flex h-10 w-10 shrink-0 items-center justify-center rounded-full',
            tone === 'good' && 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
            tone === 'bad' && 'bg-red-500/10 text-red-600 dark:text-red-400',
            !tone && 'bg-muted text-muted-foreground',
          )}
        >
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-xs text-muted-foreground">{label}</p>
          {loading ? (
            <Skeleton className="mt-1 h-6 w-20" />
          ) : (
            <p className="text-lg font-semibold tabular-nums">{value}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// --- Avance de proyectos -----------------------------------------------------

function ProjectProgress({ project }: { project: Project }) {
  const goal = Number(project.goalAmount);
  const percent = goal > 0 ? Math.min(100, (Number(project.totalContributed) / goal) * 100) : 0;
  return (
    <div>
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">{project.name}</span>
        <span className="text-muted-foreground">
          {formatAmount(project.totalContributed)} / {formatAmount(project.goalAmount)}
        </span>
      </div>
      <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={cn('h-full rounded-full', percent >= 100 ? 'bg-emerald-500' : 'bg-primary')}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}

function ReportsPage() {
  const { data: rows, isLoading, isError, refetch } = useFundSummaryQuery();
  const { data: kpis, isLoading: kpisLoading } = useDashboardKpisQuery();
  const { data: trend, isLoading: trendLoading } = useMonthlyTrendQuery();
  const { data: institutions } = useInstitutionsQuery();
  const [institutionId, setInstitutionId] = useState('');
  const color = useCurrentModuleColor();
  const isDark = useIsDarkMode();
  const headStyle = { backgroundColor: tintBackground(color, isDark), color: tintForeground(color, isDark) };

  useEffect(() => {
    if (!institutionId && institutions?.length) {
      setInstitutionId(institutions[0]!.id);
    }
  }, [institutions, institutionId]);

  const { data: projects } = useProjectsQuery(institutionId);
  const activeProjects = projects?.filter((p) => p.status === 'active') ?? [];

  return (
    <div>
      <PageHeader
        icon={BarChart3}
        title="Reportes"
        description="Panel de finanzas, tendencia mensual y detalle de asientos contabilizados."
      />

      {/* --- KPIs --- */}
      <motion.div initial="hidden" animate="show" variants={fadeUp} className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiTile icon={TrendingUp} label="Ingresos del mes" value={formatAmount(kpis?.incomeThisMonth ?? 0)} loading={kpisLoading} tone="good" />
        <KpiTile icon={TrendingDown} label="Gastos del mes" value={formatAmount(kpis?.expenseThisMonth ?? 0)} loading={kpisLoading} tone="bad" />
        <KpiTile icon={Wallet} label="Saldo de Caja" value={formatAmount(kpis?.cashBalance ?? 0)} loading={kpisLoading} />
        <KpiTile icon={ListTodo} label="Pendientes de contabilizar" value={String(kpis?.pendingCount ?? 0)} loading={kpisLoading} />
      </motion.div>

      {/* --- Tendencia mensual + Avance de proyectos --- */}
      <motion.div initial="hidden" animate="show" variants={fadeUp} className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardContent className="p-4">
            <CollapsibleSection icon={LineChart} title="Ofrenda, diezmo y talento — últimos 6 meses" defaultOpen>
              {trendLoading ? (
                <Skeleton className="h-[220px] w-full" />
              ) : (
                <MonthlyTrendChart rows={trend ?? []} />
              )}
            </CollapsibleSection>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardContent className="p-4">
            <CollapsibleSection icon={TrendingUp} title="Avance de proyectos activos" defaultOpen={false}>
              <div className="space-y-4">
                {activeProjects.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No hay proyectos activos.</p>
                ) : (
                  activeProjects.map((p) => <ProjectProgress key={p.id} project={p} />)
                )}
              </div>
            </CollapsibleSection>
          </CardContent>
        </Card>
      </motion.div>

      {/* --- Detalle por sucursal/grupo/cuenta --- */}
      <motion.div initial="hidden" animate="show" variants={fadeUp} className="mt-4">
        <Card className="rounded-2xl">
          <CardContent className="p-4">
            <CollapsibleSection icon={ListTree} title="Detalle por sucursal, grupo y cuenta" defaultOpen={false}>
        <div className="overflow-hidden rounded-2xl border shadow-sm">
          {/* Móvil: tarjetas apiladas. */}
          <div className="divide-y sm:hidden">
            {isLoading && (
              <div className="space-y-3 p-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full rounded-lg" />
                ))}
              </div>
            )}

            {isError && (
              <div className="p-4">
                <QueryErrorState message="No se pudo cargar el reporte." onRetry={() => refetch()} />
              </div>
            )}

            {!isLoading && !isError && rows?.length === 0 && (
              <p className="p-4 text-center text-sm text-muted-foreground">
                Todavía no hay movimientos contabilizados.
              </p>
            )}

            {!isLoading &&
              !isError &&
              rows?.map((row, i) => (
                <div key={i} className="p-4">
                  <p className="text-sm font-medium">{row.account}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {row.branch} · {row.group}
                  </p>
                  <div className="mt-2 flex gap-4 text-sm">
                    <span>Debe: {formatAmount(row.totalDebit)}</span>
                    <span>Haber: {formatAmount(row.totalCredit)}</span>
                  </div>
                </div>
              ))}
          </div>

          {/* Escritorio: tabla. */}
          <div className="hidden max-h-[70vh] overflow-y-auto sm:block">
            <Table>
              <TableHeader className="sticky top-0 z-[1]">
                <TableRow className="hover:bg-transparent">
                  <TableHead style={headStyle}>Sucursal</TableHead>
                  <TableHead style={headStyle}>Grupo</TableHead>
                  <TableHead style={headStyle}>Cuenta</TableHead>
                  <TableHead style={headStyle} className="text-right">Debe</TableHead>
                  <TableHead style={headStyle} className="text-right">Haber</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && <TableSkeletonRows columns={5} />}

                {isError && (
                  <TableRow>
                    <TableCell colSpan={5}>
                      <QueryErrorState message="No se pudo cargar el reporte." onRetry={() => refetch()} />
                    </TableCell>
                  </TableRow>
                )}

                {!isLoading && !isError && rows?.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                      Todavía no hay movimientos contabilizados.
                    </TableCell>
                  </TableRow>
                )}

                {rows?.map((row, i) => (
                  <TableRow key={i}>
                    <TableCell>{row.branch}</TableCell>
                    <TableCell>{row.group}</TableCell>
                    <TableCell>{row.account}</TableCell>
                    <TableCell className="text-right">{formatAmount(row.totalDebit)}</TableCell>
                    <TableCell className="text-right">{formatAmount(row.totalCredit)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
            </CollapsibleSection>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
