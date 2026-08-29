import { useEffect, useState } from 'react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { motion, type Variants } from 'framer-motion';
import { PiggyBank, Plus } from 'lucide-react';
import { useInstitutionsQuery } from '@/modules/general';
import { useBudgetsQuery } from '@/modules/finanzas';
import { BudgetFormDialog } from '@/modules/finanzas/budgets/components/budget-form-dialog';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { TableSkeletonRows } from '@/components/ui/table-skeleton';
import { Skeleton } from '@/components/ui/skeleton';
import { QueryErrorState } from '@/components/ui/query-error-state';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { PageHeader } from '@/components/layout/page-header';
import { useCurrentModuleColor } from '@/components/layout/use-current-module-color';
import { tintBackground, tintForeground } from '@/lib/color';
import { useIsDarkMode } from '@/lib/theme-store';
import { formatDate } from '@/lib/format-date';
import type { Budget } from '@isai/shared-types';

export const Route = createFileRoute('/_authenticated/finance/budgets/')({
  component: BudgetsPage,
});

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' } },
};

const STATUS_LABELS: Record<Budget['status'], string> = {
  draft: 'Borrador',
  active: 'Activo',
  closed: 'Cerrado',
};

function BudgetsPage() {
  const { data: institutions } = useInstitutionsQuery();
  const [institutionId, setInstitutionId] = useState('');
  const navigate = useNavigate();
  const color = useCurrentModuleColor();
  const isDark = useIsDarkMode();
  const headStyle = { backgroundColor: tintBackground(color, isDark), color: tintForeground(color, isDark) };

  useEffect(() => {
    if (!institutionId && institutions?.length) {
      setInstitutionId(institutions[0]!.id);
    }
  }, [institutions, institutionId]);

  const { data: budgets, isLoading, isError, refetch } = useBudgetsQuery(institutionId);
  const [createOpen, setCreateOpen] = useState(false);

  return (
    <div>
      <PageHeader
        icon={PiggyBank}
        title="Presupuestos"
        description="Cuánto se planea recibir/gastar por cuenta, contra lo real."
        action={
          <Button variant="translucent" onClick={() => setCreateOpen(true)} disabled={!institutionId}>
            <Plus className="mr-2 h-4 w-4" />
            Nuevo presupuesto
          </Button>
        }
      />

      <div className="mt-4 flex flex-wrap items-center gap-3">
        {institutions && institutions.length > 1 && (
          <Select value={institutionId} onValueChange={setInstitutionId}>
            <SelectTrigger className="w-64">
              <SelectValue placeholder="Selecciona una institución" />
            </SelectTrigger>
            <SelectContent>
              {institutions.map((inst) => (
                <SelectItem key={inst.id} value={inst.id}>
                  {inst.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      <motion.div initial="hidden" animate="show" variants={fadeUp} className="mt-6">
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
                <QueryErrorState message="No se pudieron cargar los presupuestos." onRetry={() => refetch()} />
              </div>
            )}

            {!isLoading && !isError && budgets?.length === 0 && (
              <p className="p-4 text-center text-sm text-muted-foreground">Todavía no hay presupuestos.</p>
            )}

            {!isLoading &&
              !isError &&
              budgets?.map((budget) => (
                <button
                  key={budget.id}
                  type="button"
                  className="w-full p-4 text-left"
                  onClick={() => navigate({ to: '/finance/budgets/$budgetId', params: { budgetId: budget.id } })}
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="truncate text-sm font-medium">{budget.name}</p>
                    <span className="shrink-0 text-xs text-muted-foreground">{STATUS_LABELS[budget.status]}</span>
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {budget.branch?.name ?? 'Toda la institución'} · {formatDate(budget.periodStart)} – {formatDate(budget.periodEnd)}
                  </p>
                </button>
              ))}
          </div>

          {/* Escritorio: tabla. */}
          <div className="hidden max-h-[70vh] overflow-y-auto sm:block">
            <Table>
              <TableHeader className="sticky top-0 z-[1]">
                <TableRow className="hover:bg-transparent">
                  <TableHead style={headStyle}>Presupuesto</TableHead>
                  <TableHead style={headStyle}>Alcance</TableHead>
                  <TableHead style={headStyle}>Periodo</TableHead>
                  <TableHead style={headStyle}>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && <TableSkeletonRows columns={4} />}

                {isError && (
                  <TableRow>
                    <TableCell colSpan={4}>
                      <QueryErrorState message="No se pudieron cargar los presupuestos." onRetry={() => refetch()} />
                    </TableCell>
                  </TableRow>
                )}

                {!isLoading && !isError && budgets?.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground">
                      Todavía no hay presupuestos.
                    </TableCell>
                  </TableRow>
                )}

                {budgets?.map((budget) => (
                  <TableRow
                    key={budget.id}
                    className="cursor-pointer"
                    onClick={() => navigate({ to: '/finance/budgets/$budgetId', params: { budgetId: budget.id } })}
                  >
                    <TableCell className="font-medium">{budget.name}</TableCell>
                    <TableCell>{budget.branch?.name ?? 'Toda la institución'}</TableCell>
                    <TableCell>
                      {formatDate(budget.periodStart)} – {formatDate(budget.periodEnd)}
                    </TableCell>
                    <TableCell>{STATUS_LABELS[budget.status]}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </motion.div>

      {institutionId && (
        <BudgetFormDialog open={createOpen} onOpenChange={setCreateOpen} institutionId={institutionId} />
      )}
    </div>
  );
}
