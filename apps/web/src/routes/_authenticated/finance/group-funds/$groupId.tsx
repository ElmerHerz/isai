import { useState } from 'react';
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { motion, type Variants } from 'framer-motion';
import { ArrowLeft, Landmark, Plus, TrendingDown, TrendingUp, Wallet } from 'lucide-react';
import { useGroupQuery } from '@/modules/membresia';
import { useGroupFundBalanceQuery, useGroupFundMovementsQuery, useGroupFundsSummaryQuery } from '@/modules/finanzas';
import { AddGroupFundMovementDialog } from '@/modules/finanzas/group-funds/components/add-group-fund-movement-dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { QueryErrorState } from '@/components/ui/query-error-state';
import { PageHeader } from '@/components/layout/page-header';
import { formatDate } from '@/lib/format-date';
import { cn } from '@/lib/utils';

export const Route = createFileRoute('/_authenticated/finance/group-funds/$groupId')({
  component: GroupFundDetailPage,
});

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' } },
};

function formatAmount(amount: string | number) {
  return `$${Number(amount).toFixed(2)}`;
}

function GroupFundDetailPage() {
  const { groupId } = Route.useParams();
  const navigate = useNavigate();
  const { data: group, isLoading: isGroupLoading, isError: isGroupError, refetch: refetchGroup } = useGroupQuery(groupId);
  // Grupos a los que el usuario tiene alcance (mismo filtro que la lista) —
  // para poder saltar de uno a otro sin volver a /finance/group-funds,
  // útil para un Tesorero que maneja el fondo de varios grupos a la vez.
  const { data: accessibleGroups } = useGroupFundsSummaryQuery(group?.institutionId ?? '');
  const { data: fundBalance } = useGroupFundBalanceQuery(groupId);
  const {
    data: fundMovements,
    isLoading: isFundMovementsLoading,
    isError: isFundMovementsError,
    refetch: refetchFundMovements,
  } = useGroupFundMovementsQuery(groupId);
  const [fundMovementType, setFundMovementType] = useState<'income' | 'expense' | null>(null);

  if (isGroupError) {
    return <QueryErrorState message="No se pudo cargar el grupo." onRetry={() => refetchGroup()} />;
  }

  if (isGroupLoading || !group) {
    return <p className="text-muted-foreground">Cargando...</p>;
  }

  return (
    <div>
      <Link
        to="/finance/group-funds"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Fondos de Grupo
      </Link>

      <div className="mt-3">
        <PageHeader
          icon={Landmark}
          title={group.name}
          description={[group.groupType.name, group.branch?.name].filter(Boolean).join(' · ')}
        />
      </div>

      {accessibleGroups && accessibleGroups.length > 1 && (
        <div className="mt-4">
          <Select
            value={groupId}
            onValueChange={(newGroupId) => navigate({ to: '/finance/group-funds/$groupId', params: { groupId: newGroupId } })}
          >
            <SelectTrigger className="w-full sm:w-72">
              <SelectValue placeholder="Cambiar de grupo" />
            </SelectTrigger>
            <SelectContent>
              {accessibleGroups.map((g) => (
                <SelectItem key={g.id} value={g.id}>
                  {g.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <motion.div initial="hidden" animate="show" variants={fadeUp} className="mt-6">
        <Card className="min-w-0 rounded-2xl">
          <CardContent className="p-6">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <h2 className="flex items-center gap-2 text-sm font-semibold">
                <Wallet className="h-4 w-4" />
                Movimientos
              </h2>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!group.cashAccountId}
                  onClick={() => setFundMovementType('income')}
                >
                  <Plus className="mr-1.5 h-4 w-4" />
                  Ingreso
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!group.cashAccountId}
                  onClick={() => setFundMovementType('expense')}
                >
                  <Plus className="mr-1.5 h-4 w-4" />
                  Gasto
                </Button>
              </div>
            </div>

            {!group.cashAccountId && (
              <p className="mb-4 text-xs font-medium text-amber-600 dark:text-amber-400">
                Sin cuenta de caja configurada — no se pueden registrar movimientos todavía.{' '}
                <Link
                  to="/membership/groups/$groupId"
                  params={{ groupId }}
                  className="underline underline-offset-2 hover:text-amber-700 dark:hover:text-amber-300"
                >
                  Edita el grupo
                </Link>{' '}
                para elegir dónde vive el dinero de este fondo.
              </p>
            )}

            <div
              className={cn(
                'mb-4 flex items-center gap-2 rounded-xl p-4',
                fundBalance && Number(fundBalance.balance) < 0
                  ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400'
                  : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400',
              )}
            >
              <Wallet className="h-5 w-5 shrink-0" />
              <div>
                <p className="text-xs font-medium opacity-80">Saldo actual</p>
                <p className="text-xl font-bold">{formatAmount(fundBalance?.balance ?? '0')}</p>
              </div>
            </div>

            {isFundMovementsLoading && (
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full rounded-lg" />
                ))}
              </div>
            )}

            {isFundMovementsError && (
              <QueryErrorState message="No se pudieron cargar los movimientos." onRetry={() => refetchFundMovements()} />
            )}

            {!isFundMovementsLoading && !isFundMovementsError && fundMovements?.length === 0 && (
              <p className="text-sm text-muted-foreground">Todavía no hay movimientos registrados en este fondo.</p>
            )}

            <ul className="space-y-2">
              {fundMovements?.map((movement) => (
                <li key={movement.id} className="flex items-center justify-between gap-2 rounded-lg border px-3 py-2">
                  <div className="flex min-w-0 items-center gap-2">
                    {movement.type === 'income' ? (
                      <TrendingUp className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                    ) : (
                      <TrendingDown className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
                    )}
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{movement.account.code} · {movement.account.name}</p>
                      <p className="truncate text-xs text-muted-foreground">{formatDate(movement.entryDate)}</p>
                    </div>
                  </div>
                  <span
                    className={cn(
                      'shrink-0 text-sm font-medium',
                      movement.type === 'income' ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400',
                    )}
                  >
                    {movement.type === 'income' ? '+' : '-'}{formatAmount(movement.amount)}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </motion.div>

      {fundMovementType && (
        <AddGroupFundMovementDialog
          open={!!fundMovementType}
          onOpenChange={(open) => !open && setFundMovementType(null)}
          groupId={groupId}
          type={fundMovementType}
        />
      )}
    </div>
  );
}
