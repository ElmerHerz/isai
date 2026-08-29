import { Fragment, useEffect, useMemo, useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { motion, type Variants } from 'framer-motion';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Wallet,
  ListTodo,
  LineChart,
  ListTree,
  FileBarChart2,
  Scale,
  Receipt,
  Download,
} from 'lucide-react';
import {
  useFundSummaryQuery,
  useDashboardKpisQuery,
  useMonthlyTrendQuery,
  useIncomeStatementQuery,
  useBalanceSheetQuery,
  useDonorStatementQuery,
  useRegisterDonorStatementReceiptMutation,
  useDownloadDonorStatementPdf,
  useExportEntriesCsv,
} from '@/modules/finanzas';
import { useProjectsQuery } from '@/modules/proyectos';
import { useInstitutionsQuery } from '@/modules/general';
import { usePersonsQuery } from '@/modules/membresia';
import { MonthlyTrendChart } from '@/modules/finanzas/reports/monthly-trend-chart';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { TableSkeletonRows } from '@/components/ui/table-skeleton';
import { Skeleton } from '@/components/ui/skeleton';
import { QueryErrorState } from '@/components/ui/query-error-state';
import { Card, CardContent } from '@/components/ui/card';
import { CollapsibleSection } from '@/components/ui/collapsible-section';
import { DateInput } from '@/components/ui/date-input';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/layout/page-header';
import { useCurrentModuleColor } from '@/components/layout/use-current-module-color';
import { useAuthStore } from '@/lib/auth-store';
import { tintBackground, tintForeground } from '@/lib/color';
import { useIsDarkMode } from '@/lib/theme-store';
import { cn } from '@/lib/utils';
import type { AccountBalanceNode, Project } from '@isai/shared-types';

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

// --- Estado de Resultados / Balance General ---------------------------------

const todayISO = () => new Date().toISOString().slice(0, 10);
const startOfYearISO = () => `${new Date().getFullYear()}-01-01`;

function AccountTreeRows({ nodes, depth = 0 }: { nodes: AccountBalanceNode[]; depth?: number }) {
  return (
    <>
      {nodes.map((node) => (
        <Fragment key={node.id}>
          <TableRow>
            <TableCell style={{ paddingLeft: `${1 + depth * 1.25}rem` }} className={cn(node.children.length > 0 && 'font-semibold')}>
              <span className={cn(node.isComputed && 'italic text-muted-foreground')}>
                {node.name}
                {node.isComputed && ' (cálculo automático)'}
              </span>
            </TableCell>
            <TableCell className={cn('text-right', node.children.length > 0 && 'font-semibold')}>
              {formatAmount(node.total)}
            </TableCell>
          </TableRow>
          {node.children.length > 0 && <AccountTreeRows nodes={node.children} depth={depth + 1} />}
        </Fragment>
      ))}
    </>
  );
}

function AccountTree({ nodes, emptyMessage }: { nodes: AccountBalanceNode[]; emptyMessage: string }) {
  if (nodes.length === 0) {
    return <p className="p-4 text-center text-sm text-muted-foreground">{emptyMessage}</p>;
  }
  return (
    <Table>
      <TableBody>
        <AccountTreeRows nodes={nodes} />
      </TableBody>
    </Table>
  );
}

// --- Comprobantes de donación (§8.1) -----------------------------------------
// "Registrar" y "Descargar" son acciones separadas a propósito — el folio de
// un comprobante anual no puede regenerarse en cada descarga, así que nunca
// es un efecto secundario de previsualizar (ver plan de sesión).

function DonorStatementSection({ institutionId }: { institutionId: string }) {
  const permissions = useAuthStore((state) => state.user?.permissions) ?? [];
  const canViewPersons = permissions.includes('membership.person.view');
  const { data: persons } = usePersonsQuery(institutionId, canViewPersons);

  const [search, setSearch] = useState('');
  const [personId, setPersonId] = useState('');
  const [year, setYear] = useState(new Date().getFullYear());

  const matches = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return [];
    return (persons ?? []).filter((p) => `${p.firstName} ${p.lastName}`.toLowerCase().includes(term)).slice(0, 8);
  }, [persons, search]);

  const selectedPerson = persons?.find((p) => p.id === personId);

  const { data: statement, isLoading, isError, refetch } = useDonorStatementQuery(personId, year);
  const registerMutation = useRegisterDonorStatementReceiptMutation();
  const { download, isDownloading } = useDownloadDonorStatementPdf();

  return (
    <CollapsibleSection icon={Receipt} title="Comprobantes de donación" defaultOpen={false}>
      <div className="mb-4 flex flex-wrap items-end gap-4">
        <div className="w-64 space-y-1.5">
          <Label htmlFor="donor-statement-search">Persona</Label>
          <Input
            id="donor-statement-search"
            placeholder="Buscar por nombre..."
            value={selectedPerson ? `${selectedPerson.firstName} ${selectedPerson.lastName}` : search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPersonId('');
            }}
          />
          {matches.length > 0 && !personId && (
            <div className="max-h-40 overflow-y-auto rounded-lg border">
              {matches.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  className="block w-full px-3 py-1.5 text-left text-sm hover:bg-muted/50"
                  onClick={() => {
                    setPersonId(p.id);
                    setSearch('');
                  }}
                >
                  {p.firstName} {p.lastName}
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="w-28 space-y-1.5">
          <Label htmlFor="donor-statement-year">Año</Label>
          <Input
            id="donor-statement-year"
            type="number"
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
          />
        </div>
      </div>

      {!personId && <p className="text-sm text-muted-foreground">Busca una persona para ver sus donaciones del año.</p>}

      {personId && isLoading && <Skeleton className="h-40 w-full" />}

      {personId && isError && (
        <QueryErrorState message="No se pudo cargar el comprobante." onRetry={() => refetch()} />
      )}

      {personId && !isLoading && !isError && statement && (
        <div className="space-y-4">
          <DonorStatementLinesTable statement={statement} />

          <div className="flex flex-wrap items-center gap-3 border-t pt-3">
            {statement.receipt ? (
              <>
                <span className="text-sm text-muted-foreground">Folio: <span className="font-semibold text-foreground">{statement.receipt.documentNumber}</span></span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={isDownloading}
                  onClick={() => download(personId, year, statement.receipt!.documentNumber)}
                >
                  {isDownloading ? 'Descargando...' : 'Descargar PDF'}
                </Button>
              </>
            ) : (
              <Button
                variant="outline"
                size="sm"
                disabled={registerMutation.isPending || statement.lines.length === 0}
                onClick={() => registerMutation.mutate({ personId, year })}
              >
                {registerMutation.isPending ? 'Registrando...' : 'Registrar comprobante'}
              </Button>
            )}
          </div>
        </div>
      )}
    </CollapsibleSection>
  );
}

// Tabla simple de líneas + total — nombre "Stub" solo para diferenciarla de
// AccountTree (árbol jerárquico de cuentas), esta es una lista plana.
function DonorStatementLinesTable({ statement }: { statement: NonNullable<ReturnType<typeof useDonorStatementQuery>['data']> }) {
  if (statement.lines.length === 0) {
    return <p className="text-sm text-muted-foreground">Sin donaciones registradas para {statement.year}.</p>;
  }
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Fecha</TableHead>
          <TableHead>Concepto</TableHead>
          <TableHead className="text-right">Monto</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {statement.lines.map((line, i) => (
          <TableRow key={i}>
            <TableCell>{line.date}</TableCell>
            <TableCell>{line.description}</TableCell>
            <TableCell className="text-right">{formatAmount(line.amount)}</TableCell>
          </TableRow>
        ))}
        <TableRow>
          <TableCell colSpan={2} className="text-right font-semibold">Total</TableCell>
          <TableCell className="text-right font-semibold">{formatAmount(statement.totalDonated)}</TableCell>
        </TableRow>
      </TableBody>
    </Table>
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

  const [statementStart, setStatementStart] = useState(startOfYearISO());
  const [statementEnd, setStatementEnd] = useState(todayISO());
  const { data: incomeStatement, isLoading: incomeStatementLoading } = useIncomeStatementQuery(statementStart, statementEnd);
  const { download: downloadCsv, isDownloading: isDownloadingCsv } = useExportEntriesCsv();

  const [balanceAsOf, setBalanceAsOf] = useState(todayISO());
  const { data: balanceSheet, isLoading: balanceSheetLoading } = useBalanceSheetQuery(balanceAsOf);
  const netResultTone = Number(incomeStatement?.netResult ?? 0) >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400';

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

      {/* --- Estado de Resultados --- */}
      <motion.div initial="hidden" animate="show" variants={fadeUp} className="mt-4">
        <Card className="rounded-2xl">
          <CardContent className="p-4">
            <CollapsibleSection icon={FileBarChart2} title="Estado de Resultados" defaultOpen={false}>
              <div className="mb-4 flex flex-wrap items-end gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="statement-start">Desde</Label>
                  <DateInput id="statement-start" value={statementStart} onChange={setStatementStart} max={statementEnd} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="statement-end">Hasta</Label>
                  <DateInput id="statement-end" value={statementEnd} onChange={setStatementEnd} min={statementStart} max={todayISO()} />
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => void downloadCsv(statementStart, statementEnd)}
                  disabled={isDownloadingCsv}
                >
                  <Download className="mr-1.5 h-4 w-4" />
                  {isDownloadingCsv ? 'Descargando...' : 'Descargar CSV'}
                </Button>
              </div>

              {incomeStatementLoading ? (
                <Skeleton className="h-40 w-full" />
              ) : (
                <div className="space-y-4">
                  <div>
                    <p className="mb-1 text-sm font-semibold text-muted-foreground">Ingresos</p>
                    <AccountTree nodes={incomeStatement?.income ?? []} emptyMessage="Sin ingresos en este rango." />
                  </div>
                  <div>
                    <p className="mb-1 text-sm font-semibold text-muted-foreground">Gastos</p>
                    <AccountTree nodes={incomeStatement?.expense ?? []} emptyMessage="Sin gastos en este rango." />
                  </div>
                  <div className="flex flex-wrap justify-end gap-x-6 gap-y-1 border-t pt-3 text-sm">
                    <span>Total Ingresos: <span className="font-semibold">{formatAmount(incomeStatement?.totalIncome ?? 0)}</span></span>
                    <span>Total Gastos: <span className="font-semibold">{formatAmount(incomeStatement?.totalExpense ?? 0)}</span></span>
                    <span className={netResultTone}>Resultado Neto: <span className="font-semibold">{formatAmount(incomeStatement?.netResult ?? 0)}</span></span>
                  </div>
                </div>
              )}
            </CollapsibleSection>
          </CardContent>
        </Card>
      </motion.div>

      {/* --- Balance General --- */}
      <motion.div initial="hidden" animate="show" variants={fadeUp} className="mt-4">
        <Card className="rounded-2xl">
          <CardContent className="p-4">
            <CollapsibleSection icon={Scale} title="Balance General" defaultOpen={false}>
              <div className="mb-4 space-y-1.5">
                <Label htmlFor="balance-as-of">A la fecha</Label>
                <DateInput id="balance-as-of" value={balanceAsOf} onChange={setBalanceAsOf} max={todayISO()} />
              </div>

              {balanceSheetLoading ? (
                <Skeleton className="h-40 w-full" />
              ) : (
                <div className="space-y-4">
                  <div>
                    <p className="mb-1 text-sm font-semibold text-muted-foreground">Activo</p>
                    <AccountTree nodes={balanceSheet?.assets ?? []} emptyMessage="Sin cuentas de Activo con movimiento." />
                  </div>
                  <div>
                    <p className="mb-1 text-sm font-semibold text-muted-foreground">Pasivo</p>
                    <AccountTree nodes={balanceSheet?.liabilities ?? []} emptyMessage="Sin cuentas de Pasivo con movimiento." />
                  </div>
                  <div>
                    <p className="mb-1 text-sm font-semibold text-muted-foreground">Patrimonio</p>
                    <AccountTree nodes={balanceSheet?.equity ?? []} emptyMessage="Sin cuentas de Patrimonio con movimiento." />
                  </div>
                  <div className="flex flex-wrap justify-end gap-x-6 gap-y-1 border-t pt-3 text-sm">
                    <span>Total Activo: <span className="font-semibold">{formatAmount(balanceSheet?.totalAssets ?? 0)}</span></span>
                    <span>Total Pasivo: <span className="font-semibold">{formatAmount(balanceSheet?.totalLiabilities ?? 0)}</span></span>
                    <span>Total Patrimonio: <span className="font-semibold">{formatAmount(balanceSheet?.totalEquity ?? 0)}</span></span>
                  </div>
                </div>
              )}
            </CollapsibleSection>
          </CardContent>
        </Card>
      </motion.div>

      {/* --- Comprobantes de donación --- */}
      {institutionId && (
        <motion.div initial="hidden" animate="show" variants={fadeUp} className="mt-4">
          <Card className="rounded-2xl">
            <CardContent className="p-4">
              <DonorStatementSection institutionId={institutionId} />
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* --- Detalle por sucursal/grupo/cuenta --- */}
      <motion.div initial="hidden" animate="show" variants={fadeUp} className="mt-4">
        <Card className="rounded-2xl">
          <CardContent className="p-4">
            <CollapsibleSection icon={ListTree} title="Detalle por sucursal, grupo, proyecto y cuenta" defaultOpen={false}>
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
                    {row.branch} · {row.group} · {row.project}
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
                  <TableHead style={headStyle}>Proyecto</TableHead>
                  <TableHead style={headStyle}>Cuenta</TableHead>
                  <TableHead style={headStyle} className="text-right">Debe</TableHead>
                  <TableHead style={headStyle} className="text-right">Haber</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && <TableSkeletonRows columns={6} />}

                {isError && (
                  <TableRow>
                    <TableCell colSpan={6}>
                      <QueryErrorState message="No se pudo cargar el reporte." onRetry={() => refetch()} />
                    </TableCell>
                  </TableRow>
                )}

                {!isLoading && !isError && rows?.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                      Todavía no hay movimientos contabilizados.
                    </TableCell>
                  </TableRow>
                )}

                {rows?.map((row, i) => (
                  <TableRow key={i}>
                    <TableCell>{row.branch}</TableCell>
                    <TableCell>{row.group}</TableCell>
                    <TableCell>{row.project}</TableCell>
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
