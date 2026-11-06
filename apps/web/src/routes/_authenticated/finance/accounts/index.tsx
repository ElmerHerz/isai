import { useState } from 'react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { motion, type Variants } from 'framer-motion';
import { ListTree, Pencil, Plus, Trash2 } from 'lucide-react';
import { useAccountsQuery, useDeleteAccountMutation } from '@/modules/finanzas';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { TableSkeletonRows } from '@/components/ui/table-skeleton';
import { Skeleton } from '@/components/ui/skeleton';
import { QueryErrorState } from '@/components/ui/query-error-state';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { PageHeader } from '@/components/layout/page-header';
import { useCurrentModuleColor } from '@/components/layout/use-current-module-color';
import { tintBackground, tintForeground } from '@/lib/color';
import { useIsDarkMode } from '@/lib/theme-store';
import { cn } from '@/lib/utils';
import type { Account } from '@isai/shared-types';

export const Route = createFileRoute('/_authenticated/finance/accounts/')({
  component: AccountsPage,
});

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' } },
};

// Profundidad vía la cadena de parentAccountId — así el código (indentado)
// comunica la jerarquía sin necesitar un componente de árbol nuevo. Ver
// plan de sesión: con 7 cuentas sembradas, una lista indentada alcanza.
function accountDepth(account: Account, byId: Map<string, Account>): number {
  let depth = 0;
  let current = account;
  while (current.parentAccountId) {
    const parent = byId.get(current.parentAccountId);
    if (!parent) break;
    depth += 1;
    current = parent;
  }
  return depth;
}

function formatBalance(balance: string) {
  return `$${Number(balance).toFixed(2)}`;
}

function AccountsPage() {
  const { data: accounts, isLoading, isError, refetch } = useAccountsQuery();
  const navigate = useNavigate();
  const color = useCurrentModuleColor();
  const isDark = useIsDarkMode();
  const headStyle = { backgroundColor: tintBackground(color, isDark), color: tintForeground(color, isDark) };
  const deleteMutation = useDeleteAccountMutation();
  const [deletingAccount, setDeletingAccount] = useState<Account | null>(null);

  const byId = new Map((accounts ?? []).map((a) => [a.id, a]));

  return (
    <div>
      <PageHeader
        icon={ListTree}
        title="Catálogo de Cuentas"
        description="Cuentas contables del tenant, con su saldo actual."
        action={
          <Button variant="translucent" onClick={() => navigate({ to: '/finance/accounts/new' })}>
            <Plus className="mr-2 h-4 w-4" />
            Nueva cuenta
          </Button>
        }
      />

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
                <QueryErrorState message="No se pudo cargar el catálogo de cuentas." onRetry={() => refetch()} />
              </div>
            )}

            {!isLoading && !isError && accounts?.length === 0 && (
              <p className="p-4 text-center text-sm text-muted-foreground">Todavía no hay cuentas configuradas.</p>
            )}

            {!isLoading &&
              !isError &&
              accounts?.map((account) => (
                <div key={account.id} className="p-4" style={{ paddingLeft: `${1 + accountDepth(account, byId) * 1.25}rem` }}>
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {account.code} · {account.name}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">{account.accountType.name}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      {account.allowsTransactions && (
                        <span className="text-sm font-semibold">{formatBalance(account.balance)}</span>
                      )}
                      <Button
                        variant="edit"
                        size="icon"
                        onClick={() => navigate({ to: '/finance/accounts/$accountId/edit', params: { accountId: account.id } })}
                        aria-label="Editar"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="delete" size="icon" onClick={() => setDeletingAccount(account)} aria-label="Eliminar">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
          </div>

          {/* Escritorio: tabla, sin filtros/orden — pocas filas, no hace falta. */}
          <div className="hidden max-h-[70vh] overflow-y-auto sm:block">
            <Table>
              <TableHeader className="sticky top-0 z-[1]">
                <TableRow className="hover:bg-transparent">
                  <TableHead style={headStyle}>Código</TableHead>
                  <TableHead style={headStyle}>Nombre</TableHead>
                  <TableHead style={headStyle}>Tipo</TableHead>
                  <TableHead style={headStyle} className="text-right">Saldo</TableHead>
                  <TableHead style={headStyle} className="w-px" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && <TableSkeletonRows columns={5} />}

                {isError && (
                  <TableRow>
                    <TableCell colSpan={5}>
                      <QueryErrorState message="No se pudo cargar el catálogo de cuentas." onRetry={() => refetch()} />
                    </TableCell>
                  </TableRow>
                )}

                {!isLoading && !isError && accounts?.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                      Todavía no hay cuentas configuradas.
                    </TableCell>
                  </TableRow>
                )}

                {accounts?.map((account) => (
                  <TableRow key={account.id}>
                    <TableCell
                      className={cn('font-mono text-xs', !account.allowsTransactions && 'font-semibold text-muted-foreground')}
                      style={{ paddingLeft: `${1 + accountDepth(account, byId) * 1.25}rem` }}
                    >
                      {account.code}
                    </TableCell>
                    <TableCell className={cn(!account.allowsTransactions && 'font-semibold')}>{account.name}</TableCell>
                    <TableCell className="text-muted-foreground">{account.accountType.name}</TableCell>
                    <TableCell className="text-right font-medium">
                      {account.allowsTransactions ? formatBalance(account.balance) : '—'}
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="edit"
                          size="icon"
                          onClick={() => navigate({ to: '/finance/accounts/$accountId/edit', params: { accountId: account.id } })}
                          aria-label="Editar"
                          title="Editar"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="delete"
                          size="icon"
                          onClick={() => setDeletingAccount(account)}
                          aria-label="Eliminar"
                          title="Eliminar"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </motion.div>

      <ConfirmDialog
        open={!!deletingAccount}
        onOpenChange={(open) => !open && setDeletingAccount(null)}
        title="Eliminar cuenta"
        description={
          deletingAccount
            ? `Esto elimina la cuenta "${deletingAccount.code} · ${deletingAccount.name}". No se puede deshacer, y fallará si la cuenta ya está en uso.`
            : ''
        }
        isPending={deleteMutation.isPending}
        onConfirm={() => {
          if (!deletingAccount) return;
          deleteMutation.mutate(deletingAccount.id, { onSuccess: () => setDeletingAccount(null) });
        }}
      />
    </div>
  );
}
