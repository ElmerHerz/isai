import { useState } from 'react';
import { createFileRoute, Link } from '@tanstack/react-router';
import { motion, type Variants } from 'framer-motion';
import { Ban, Check, ClipboardCheck, Clock } from 'lucide-react';
import {
  useMyPendingApprovalsQuery,
  useAllPendingApprovalsQuery,
  useDecidePendingApprovalMutation,
} from '@/modules/finanzas';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { QueryErrorState } from '@/components/ui/query-error-state';
import { PageHeader } from '@/components/layout/page-header';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuthStore } from '@/lib/auth-store';
import { formatDate } from '@/lib/format-date';
import type { PendingApprovalRow } from '@isai/shared-types';

export const Route = createFileRoute('/_authenticated/finance/approvals/')({
  component: ApprovalsPage,
});

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' } },
};

function formatAmount(amount: string | number) {
  return `$${Number(amount).toFixed(2)}`;
}

function sourceLink(row: PendingApprovalRow) {
  if (row.sourceType === 'project_expense' && row.project) {
    return { label: `Proyecto: ${row.project.name}`, to: '/finance/projects/$projectId' as const, params: { projectId: row.project.id } };
  }
  if (row.sourceType === 'group_fund_expense' && row.group) {
    return { label: `Fondo: ${row.group.name}`, to: '/finance/group-funds/$groupId' as const, params: { groupId: row.group.id } };
  }
  return null;
}

interface PendingApprovalCardProps {
  row: PendingApprovalRow;
  showWaitingOn: boolean;
  canDecide: boolean;
  onApprove: () => void;
  onReject: () => void;
  isPending: boolean;
}

function PendingApprovalCard({ row, showWaitingOn, canDecide, onApprove, onReject, isPending }: PendingApprovalCardProps) {
  const link = sourceLink(row);

  return (
    <li className="flex flex-wrap items-center justify-between gap-3 rounded-lg border px-4 py-3">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">
          {row.account.code} · {row.account.name}
        </p>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">
          {link ? (
            <Link to={link.to} params={link.params} className="underline underline-offset-2 hover:text-foreground">
              {link.label}
            </Link>
          ) : (
            row.routeName
          )}
          {row.documentNumber && ` · ${row.documentNumber}`}
          {' · '}
          {formatDate(row.createdAt)}
        </p>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">
          Registrado por {row.createdByUser ? `${row.createdByUser.firstName} ${row.createdByUser.lastName}` : '—'} · Paso{' '}
          {row.stepOrder} de {row.totalSteps}
          {showWaitingOn && row.activeStepApprover && ` · Esperando: ${row.activeStepApprover.firstName} ${row.activeStepApprover.lastName}`}
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <span className="text-sm font-semibold">{formatAmount(row.amount)}</span>
        {canDecide ? (
          <>
            <Button variant="ghost" size="icon" onClick={onApprove} disabled={isPending} aria-label="Aprobar" title="Aprobar">
              <Check className="h-4 w-4 text-emerald-600" />
            </Button>
            <Button variant="ghost" size="icon" onClick={onReject} disabled={isPending} aria-label="Rechazar" title="Rechazar">
              <Ban className="h-4 w-4 text-destructive" />
            </Button>
          </>
        ) : (
          <span className="flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-950/40 dark:text-amber-400">
            <Clock className="h-3.5 w-3.5" />
            Pendiente
          </span>
        )}
      </div>
    </li>
  );
}

function ApprovalsPage() {
  const permissions = useAuthStore((state) => state.user?.permissions) ?? [];
  const canViewAll = permissions.includes('finance.approval_route.view');

  const { data: mine, isLoading: isMineLoading, isError: isMineError, refetch: refetchMine } = useMyPendingApprovalsQuery();
  const { data: all, isLoading: isAllLoading, isError: isAllError, refetch: refetchAll } = useAllPendingApprovalsQuery(canViewAll);
  const decideMutation = useDecidePendingApprovalMutation();

  const [rejectingRow, setRejectingRow] = useState<PendingApprovalRow | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const renderList = (
    rows: PendingApprovalRow[] | undefined,
    isLoading: boolean,
    isError: boolean,
    onRetry: () => void,
    showWaitingOn: boolean,
  ) => {
    if (isLoading) {
      return (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-lg" />
          ))}
        </div>
      );
    }
    if (isError) {
      return <QueryErrorState message="No se pudieron cargar las aprobaciones." onRetry={onRetry} />;
    }
    if (!rows || rows.length === 0) {
      return <p className="text-sm text-muted-foreground">No hay gastos pendientes de aprobación.</p>;
    }
    return (
      <ul className="space-y-2">
        {rows.map((row) => (
          <PendingApprovalCard
            key={row.requestId}
            row={row}
            showWaitingOn={showWaitingOn}
            canDecide={!showWaitingOn || (mine?.some((m) => m.requestId === row.requestId) ?? false)}
            isPending={decideMutation.isPending}
            onApprove={() =>
              decideMutation.mutate({
                sourceType: row.sourceType,
                parentId: (row.project?.id ?? row.group?.id)!,
                expenseId: row.sourceId,
                action: 'approve',
              })
            }
            onReject={() => setRejectingRow(row)}
          />
        ))}
      </ul>
    );
  };

  return (
    <div>
      <PageHeader
        icon={ClipboardCheck}
        title="Aprobaciones"
        description="Gastos de Proyecto y de Fondo de Grupo esperando una decisión."
      />

      <motion.div initial="hidden" animate="show" variants={fadeUp} className="mt-6">
        <Card className="rounded-2xl">
          <CardContent className="p-6">
            <Tabs defaultValue="mine">
              <TabsList>
                <TabsTrigger value="mine">Mías{mine && mine.length > 0 ? ` (${mine.length})` : ''}</TabsTrigger>
                {canViewAll && <TabsTrigger value="all">Todo el tenant{all && all.length > 0 ? ` (${all.length})` : ''}</TabsTrigger>}
              </TabsList>

              <TabsContent value="mine">{renderList(mine, isMineLoading, isMineError, () => refetchMine(), false)}</TabsContent>

              {canViewAll && (
                <TabsContent value="all">{renderList(all, isAllLoading, isAllError, () => refetchAll(), true)}</TabsContent>
              )}
            </Tabs>
          </CardContent>
        </Card>
      </motion.div>

      <Dialog
        open={!!rejectingRow}
        onOpenChange={(open) => {
          if (!open) {
            setRejectingRow(null);
            setRejectReason('');
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rechazar gasto</DialogTitle>
            <DialogDescription>
              {rejectingRow && `${rejectingRow.account.code} · ${rejectingRow.account.name} por ${formatAmount(rejectingRow.amount)} — indica el motivo.`}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label htmlFor="reject-approval-reason">Motivo</Label>
            <Input
              id="reject-approval-reason"
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
                setRejectingRow(null);
                setRejectReason('');
              }}
              disabled={decideMutation.isPending}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="delete"
              disabled={decideMutation.isPending || !rejectReason.trim()}
              onClick={() => {
                if (!rejectingRow) return;
                decideMutation.mutate(
                  {
                    sourceType: rejectingRow.sourceType,
                    parentId: (rejectingRow.project?.id ?? rejectingRow.group?.id)!,
                    expenseId: rejectingRow.sourceId,
                    action: 'reject',
                    reason: rejectReason.trim(),
                  },
                  {
                    onSuccess: () => {
                      setRejectingRow(null);
                      setRejectReason('');
                    },
                  },
                );
              }}
            >
              {decideMutation.isPending ? 'Rechazando...' : 'Rechazar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
