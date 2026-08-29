import { useState } from 'react';
import { createFileRoute, Link } from '@tanstack/react-router';
import { motion, type Variants } from 'framer-motion';
import { ArrowLeft, PiggyBank, Pencil, Plus, Trash2, AlertTriangle } from 'lucide-react';
import { useBudgetQuery, useBudgetVsActualQuery, useRemoveBudgetLineMutation } from '@/modules/finanzas';
import { BudgetFormDialog } from '@/modules/finanzas/budgets/components/budget-form-dialog';
import { AddBudgetLineDialog } from '@/modules/finanzas/budgets/components/add-budget-line-dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { QueryErrorState } from '@/components/ui/query-error-state';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { PageHeader } from '@/components/layout/page-header';
import { formatDate, todayLocalDateInput } from '@/lib/format-date';
import { cn } from '@/lib/utils';

export const Route = createFileRoute('/_authenticated/finance/budgets/$budgetId')({
  component: BudgetDetailPage,
});

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' } },
};

const STATUS_LABELS: Record<string, string> = { draft: 'Borrador', active: 'Activo', closed: 'Cerrado' };

function formatAmount(amount: string | number) {
  return `$${Number(amount).toFixed(2)}`;
}

function BudgetDetailPage() {
  const { budgetId } = Route.useParams();
  const { data: budget, isLoading, isError, refetch } = useBudgetQuery(budgetId);
  const [editOpen, setEditOpen] = useState(false);
  const [addLineOpen, setAddLineOpen] = useState(false);
  const [removingLineId, setRemovingLineId] = useState<string | null>(null);
  const [month, setMonth] = useState(todayLocalDateInput().slice(0, 7));

  const removeLineMutation = useRemoveBudgetLineMutation(budgetId);
  const { data: actualRows, isLoading: actualLoading } = useBudgetVsActualQuery(budgetId, month);

  if (isLoading) {
    return (
      <div>
        <Skeleton className="h-10 w-64" />
        <Skeleton className="mt-4 h-48 w-full" />
      </div>
    );
  }

  if (isError || !budget) {
    return <QueryErrorState message="No se pudo cargar el presupuesto." onRetry={() => refetch()} />;
  }

  const existingAccountIds = budget.lines.map((l) => l.accountId);
  const actualByAccount = new Map((actualRows ?? []).map((r) => [r.accountId, r]));

  return (
    <div>
      <Link to="/finance/budgets" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Presupuestos
      </Link>

      <PageHeader
        icon={PiggyBank}
        title={budget.name}
        description={`${budget.branch?.name ?? 'Toda la institución'} · ${formatDate(budget.periodStart)} – ${formatDate(budget.periodEnd)} · ${STATUS_LABELS[budget.status] ?? budget.status}`}
        action={
          <Button variant="outline" onClick={() => setEditOpen(true)}>
            <Pencil className="mr-2 h-4 w-4" /> Editar
          </Button>
        }
      />

      {budget.notes && <p className="mt-4 text-sm text-muted-foreground">{budget.notes}</p>}

      <motion.div initial="hidden" animate="show" variants={fadeUp} className="mt-6">
        <Card className="rounded-2xl">
          <CardContent className="p-4">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold">Líneas del presupuesto</h2>
              <Button variant="outline" size="sm" onClick={() => setAddLineOpen(true)}>
                <Plus className="mr-1.5 h-4 w-4" /> Agregar línea
              </Button>
            </div>

            {budget.lines.length === 0 ? (
              <p className="text-sm text-muted-foreground">Todavía no hay líneas — agrega una cuenta arriba.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cuenta</TableHead>
                    <TableHead className="text-right">Monto mensual</TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {budget.lines.map((line) => (
                    <TableRow key={line.id}>
                      <TableCell>
                        {line.account.code} · {line.account.name}
                      </TableCell>
                      <TableCell className="text-right">{formatAmount(line.monthlyAmount)}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" onClick={() => setRemovingLineId(line.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </motion.div>

      <motion.div initial="hidden" animate="show" variants={fadeUp} className="mt-4">
        <Card className="rounded-2xl">
          <CardContent className="p-4">
            <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
              <h2 className="text-sm font-semibold">Presupuestado vs. real</h2>
              <div className="space-y-1.5">
                <Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="w-40" />
              </div>
            </div>

            {actualLoading ? (
              <Skeleton className="h-32 w-full" />
            ) : budget.lines.length === 0 ? (
              <p className="text-sm text-muted-foreground">Agrega líneas al presupuesto para ver esta comparación.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cuenta</TableHead>
                    <TableHead className="text-right">Presupuestado</TableHead>
                    <TableHead className="text-right">Real</TableHead>
                    <TableHead className="text-right">% ejecución</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {budget.lines.map((line) => {
                    const row = actualByAccount.get(line.accountId);
                    const budgeted = Number(line.monthlyAmount);
                    const actual = Number(row?.actual ?? 0);
                    const percent = budgeted > 0 ? (actual / budgeted) * 100 : actual > 0 ? Infinity : 0;
                    const overspent = actual > budgeted && budgeted > 0;
                    return (
                      <TableRow key={line.id}>
                        <TableCell>{line.account.code} · {line.account.name}</TableCell>
                        <TableCell className="text-right">{formatAmount(budgeted)}</TableCell>
                        <TableCell className="text-right">{formatAmount(actual)}</TableCell>
                        <TableCell className="text-right">
                          <span
                            className={cn(
                              'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
                              overspent
                                ? 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400'
                                : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400',
                            )}
                          >
                            {overspent && <AlertTriangle className="h-3 w-3" />}
                            {Number.isFinite(percent) ? `${percent.toFixed(0)}%` : '—'}
                          </span>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </motion.div>

      <BudgetFormDialog open={editOpen} onOpenChange={setEditOpen} institutionId={budget.institutionId} budget={budget} />
      <AddBudgetLineDialog
        open={addLineOpen}
        onOpenChange={setAddLineOpen}
        budgetId={budgetId}
        existingAccountIds={existingAccountIds}
      />
      <ConfirmDialog
        open={!!removingLineId}
        onOpenChange={(open) => !open && setRemovingLineId(null)}
        title="¿Quitar esta línea?"
        description="Se elimina del presupuesto — no afecta ningún asiento contable ya registrado."
        isPending={removeLineMutation.isPending}
        onConfirm={() => {
          if (removingLineId) {
            removeLineMutation.mutate(removingLineId, { onSuccess: () => setRemovingLineId(null) });
          }
        }}
      />
    </div>
  );
}
