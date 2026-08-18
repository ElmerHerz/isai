import { useState } from 'react';
import { createFileRoute, Link } from '@tanstack/react-router';
import { motion, type Variants } from 'framer-motion';
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  CircleDollarSign,
  Clock,
  Flag,
  Landmark,
  MapPin,
  Pencil,
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
  useProjectExpensesQuery,
  useRemoveProjectExpenseMutation,
  usePostProjectExpenseToLedgerMutation,
} from '@/modules/finanzas';
import { ProjectFormDialog } from '@/modules/finanzas/projects/components/project-form-dialog';
import { AddContributionDialog } from '@/modules/finanzas/projects/components/add-contribution-dialog';
import { AddExpenseDialog } from '@/modules/finanzas/projects/components/add-expense-dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { QueryErrorState } from '@/components/ui/query-error-state';
import { PageHeader } from '@/components/layout/page-header';
import { formatDate, daysUntilLocal } from '@/lib/format-date';
import { cn } from '@/lib/utils';
import type { ProjectContribution, ProjectExpense } from '@isai/shared-types';

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
  const {
    data: expenses,
    isLoading: isExpensesLoading,
    isError: isExpensesError,
    refetch: refetchExpenses,
  } = useProjectExpensesQuery(projectId);
  const removeExpenseMutation = useRemoveProjectExpenseMutation(projectId);
  const postExpenseMutation = usePostProjectExpenseToLedgerMutation(projectId);

  const [editOpen, setEditOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [removingContribution, setRemovingContribution] = useState<ProjectContribution | null>(null);
  const [postingContribution, setPostingContribution] = useState<ProjectContribution | null>(null);
  const [addExpenseOpen, setAddExpenseOpen] = useState(false);
  const [removingExpense, setRemovingExpense] = useState<ProjectExpense | null>(null);
  const [postingExpense, setPostingExpense] = useState<ProjectExpense | null>(null);

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

  const kpis: { label: string; value: string; icon: LucideIcon; tone: StatTone }[] = [
    { label: 'Recaudado', value: formatAmount(totalContributed), icon: TrendingUp, tone: 'emerald' },
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

        <Card className="rounded-2xl">
          <CardContent className="p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-sm font-semibold">
                <Users className="h-4 w-4" />
                Aportes
              </h2>
              <Button variant="outline" size="sm" onClick={() => setAddOpen(true)}>
                <Plus className="mr-1.5 h-4 w-4" />
                Agregar
              </Button>
            </div>

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
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardContent className="p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-sm font-semibold">
                <Receipt className="h-4 w-4" />
                Gastos
              </h2>
              <Button variant="outline" size="sm" onClick={() => setAddExpenseOpen(true)}>
                <Plus className="mr-1.5 h-4 w-4" />
                Agregar
              </Button>
            </div>

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
          </CardContent>
        </Card>
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
    </div>
  );
}
