import { useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { motion, type Variants } from 'framer-motion';
import { FileCheck, Plus, Pencil } from 'lucide-react';
import { useApprovalRoutesQuery, useUpdateApprovalRouteMutation } from '@/modules/proyectos';
import { ApprovalRouteFormDialog } from '@/modules/proyectos/approval-routes/components/approval-route-form-dialog';
import { EditApprovalRouteAmountDialog } from '@/modules/proyectos/approval-routes/components/edit-approval-route-amount-dialog';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { TableSkeletonRows } from '@/components/ui/table-skeleton';
import { Skeleton } from '@/components/ui/skeleton';
import { QueryErrorState } from '@/components/ui/query-error-state';
import { PageHeader } from '@/components/layout/page-header';
import { useCurrentModuleColor } from '@/components/layout/use-current-module-color';
import { tintBackground, tintForeground } from '@/lib/color';
import { useIsDarkMode } from '@/lib/theme-store';
import type { ApprovalRoute } from '@isai/shared-types';

export const Route = createFileRoute('/_authenticated/finance/approval-routes/')({
  component: ApprovalRoutesPage,
});

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' } },
};

function formatAmount(amount: string | number) {
  return `$${Number(amount).toFixed(2)}`;
}

function scopeLabel(route: ApprovalRoute) {
  if (!route.institution) return 'Todo el tenant';
  if (!route.branch) return route.institution.name;
  return `${route.institution.name} · ${route.branch.name}`;
}

function accountsLabel(route: ApprovalRoute) {
  if (route.accounts.length === 0) return 'Cualquier cuenta';
  return route.accounts.map((a) => a.account.name).join(', ');
}

function ApprovalRoutesPage() {
  const { data: routes, isLoading, isError, refetch } = useApprovalRoutesQuery();
  const updateMutation = useUpdateApprovalRouteMutation();
  const color = useCurrentModuleColor();
  const isDark = useIsDarkMode();
  const headStyle = { backgroundColor: tintBackground(color, isDark), color: tintForeground(color, isDark) };

  const [createOpen, setCreateOpen] = useState(false);
  const [editingRoute, setEditingRoute] = useState<ApprovalRoute | null>(null);

  return (
    <div>
      <PageHeader
        icon={FileCheck}
        title="Rutas de Aprobación"
        description="A partir de qué monto un gasto de proyecto necesita aprobación, y quién debe aprobarlo, en orden."
        action={
          <Button variant="translucent" onClick={() => setCreateOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Nueva ruta
          </Button>
        }
      />

      <motion.div initial="hidden" animate="show" variants={fadeUp} className="mt-6">
        <div className="overflow-hidden rounded-2xl border shadow-sm">
          {/* Móvil: tarjetas apiladas. */}
          <div className="divide-y sm:hidden">
            {isLoading && (
              <div className="space-y-3 p-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-20 w-full rounded-lg" />
                ))}
              </div>
            )}

            {isError && (
              <div className="p-4">
                <QueryErrorState message="No se pudieron cargar las rutas de aprobación." onRetry={() => refetch()} />
              </div>
            )}

            {!isLoading && !isError && routes?.length === 0 && (
              <p className="p-4 text-center text-sm text-muted-foreground">Todavía no hay rutas de aprobación.</p>
            )}

            {!isLoading &&
              !isError &&
              routes?.map((route) => (
                <div key={route.id} className="p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="truncate text-sm font-medium">{route.name}</p>
                    <Switch
                      checked={route.isActive}
                      onCheckedChange={(checked) => updateMutation.mutate({ id: route.id, dto: { isActive: checked } })}
                    />
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {scopeLabel(route)} · desde {formatAmount(route.minAmount)}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">{accountsLabel(route)}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {route.steps.map((s) => `${s.approverUser.firstName} ${s.approverUser.lastName}`).join(' → ')}
                  </p>
                  <Button variant="ghost" size="sm" className="mt-2" onClick={() => setEditingRoute(route)}>
                    <Pencil className="mr-1.5 h-3.5 w-3.5" />
                    Editar monto
                  </Button>
                </div>
              ))}
          </div>

          {/* Escritorio: tabla. */}
          <div className="hidden max-h-[70vh] overflow-y-auto sm:block">
            <Table>
              <TableHeader className="sticky top-0 z-[1]">
                <TableRow className="hover:bg-transparent">
                  <TableHead style={headStyle}>Ruta</TableHead>
                  <TableHead style={headStyle}>Alcance</TableHead>
                  <TableHead style={headStyle}>Cuentas</TableHead>
                  <TableHead style={headStyle}>Monto mínimo</TableHead>
                  <TableHead style={headStyle}>Pasos</TableHead>
                  <TableHead style={headStyle}>Activa</TableHead>
                  <TableHead style={headStyle} />
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && <TableSkeletonRows columns={7} />}

                {isError && (
                  <TableRow>
                    <TableCell colSpan={7}>
                      <QueryErrorState message="No se pudieron cargar las rutas de aprobación." onRetry={() => refetch()} />
                    </TableCell>
                  </TableRow>
                )}

                {!isLoading && !isError && routes?.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground">
                      Todavía no hay rutas de aprobación.
                    </TableCell>
                  </TableRow>
                )}

                {routes?.map((route) => (
                  <TableRow key={route.id}>
                    <TableCell className="font-medium">{route.name}</TableCell>
                    <TableCell>{scopeLabel(route)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{accountsLabel(route)}</TableCell>
                    <TableCell>{formatAmount(route.minAmount)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {route.steps.map((s) => `${s.approverUser.firstName} ${s.approverUser.lastName}`).join(' → ')}
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={route.isActive}
                        onCheckedChange={(checked) => updateMutation.mutate({ id: route.id, dto: { isActive: checked } })}
                      />
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" onClick={() => setEditingRoute(route)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </motion.div>

      <ApprovalRouteFormDialog open={createOpen} onOpenChange={setCreateOpen} />

      {editingRoute && (
        <EditApprovalRouteAmountDialog
          open={!!editingRoute}
          onOpenChange={(open) => !open && setEditingRoute(null)}
          route={editingRoute}
        />
      )}
    </div>
  );
}
