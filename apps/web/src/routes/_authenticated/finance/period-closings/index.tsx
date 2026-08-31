import { useEffect, useState } from 'react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { motion, type Variants } from 'framer-motion';
import { Lock, Plus } from 'lucide-react';
import { useInstitutionsQuery } from '@/modules/general';
import { usePeriodClosingsQuery, useReopenPeriodClosingMutation } from '@/modules/finanzas';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { TableSkeletonRows } from '@/components/ui/table-skeleton';
import { Skeleton } from '@/components/ui/skeleton';
import { QueryErrorState } from '@/components/ui/query-error-state';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { PageHeader } from '@/components/layout/page-header';
import { useCurrentModuleColor } from '@/components/layout/use-current-module-color';
import { tintBackground, tintForeground } from '@/lib/color';
import { useIsDarkMode } from '@/lib/theme-store';
import { useAuthStore } from '@/lib/auth-store';
import { formatDate } from '@/lib/format-date';
import type { PeriodClosing } from '@isai/shared-types';

export const Route = createFileRoute('/_authenticated/finance/period-closings/')({
  component: PeriodClosingsPage,
});

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' } },
};

function PeriodClosingsPage() {
  const navigate = useNavigate();
  const { data: institutions } = useInstitutionsQuery();
  const [institutionId, setInstitutionId] = useState('');
  const color = useCurrentModuleColor();
  const isDark = useIsDarkMode();
  const headStyle = { backgroundColor: tintBackground(color, isDark), color: tintForeground(color, isDark) };
  const currentUser = useAuthStore((state) => state.user);
  const isSuperadmin = !!currentUser && !currentUser.tenantId;

  useEffect(() => {
    if (!institutionId && institutions?.length) {
      setInstitutionId(institutions[0]!.id);
    }
  }, [institutions, institutionId]);

  const { data: closings, isLoading, isError, refetch } = usePeriodClosingsQuery(institutionId);
  const [reopening, setReopening] = useState<PeriodClosing | null>(null);
  const [reopenReason, setReopenReason] = useState('');
  const reopenMutation = useReopenPeriodClosingMutation();

  return (
    <div>
      <PageHeader
        icon={Lock}
        title="Cierre de periodo"
        description="Mueve el resultado neto de Ingreso/Gasto a Patrimonio y bloquea corregir asientos hacia atrás."
        action={
          <Button variant="translucent" onClick={() => navigate({ to: '/finance/period-closings/new' })} disabled={!institutionId}>
            <Plus className="mr-2 h-4 w-4" />
            Cerrar periodo
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
                <QueryErrorState message="No se pudieron cargar los cierres de periodo." onRetry={() => refetch()} />
              </div>
            )}

            {!isLoading && !isError && closings?.length === 0 && (
              <p className="p-4 text-center text-sm text-muted-foreground">Todavía no hay periodos cerrados.</p>
            )}

            {!isLoading &&
              !isError &&
              closings?.map((closing) => (
                <div key={closing.id} className="p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-medium">Cerrado hasta {formatDate(closing.closedThroughDate)}</p>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {closing.reopenedAt ? 'Reabierto' : 'Activo'}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {closing.branch?.name ?? 'Toda la institución'} · {closing.targetEquityAccount.name}
                  </p>
                  {isSuperadmin && !closing.reopenedAt && (
                    <Button variant="outline" size="sm" className="mt-2" onClick={() => setReopening(closing)}>
                      Reabrir
                    </Button>
                  )}
                </div>
              ))}
          </div>

          <div className="hidden max-h-[70vh] overflow-y-auto sm:block">
            <Table>
              <TableHeader className="sticky top-0 z-[1]">
                <TableRow className="hover:bg-transparent">
                  <TableHead style={headStyle}>Cerrado hasta</TableHead>
                  <TableHead style={headStyle}>Alcance</TableHead>
                  <TableHead style={headStyle}>Cuenta destino</TableHead>
                  <TableHead style={headStyle}>Estado</TableHead>
                  {isSuperadmin && <TableHead style={headStyle} />}
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && <TableSkeletonRows columns={isSuperadmin ? 5 : 4} />}

                {isError && (
                  <TableRow>
                    <TableCell colSpan={isSuperadmin ? 5 : 4}>
                      <QueryErrorState message="No se pudieron cargar los cierres de periodo." onRetry={() => refetch()} />
                    </TableCell>
                  </TableRow>
                )}

                {!isLoading && !isError && closings?.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={isSuperadmin ? 5 : 4} className="text-center text-muted-foreground">
                      Todavía no hay periodos cerrados.
                    </TableCell>
                  </TableRow>
                )}

                {closings?.map((closing) => (
                  <TableRow key={closing.id}>
                    <TableCell className="font-medium">{formatDate(closing.closedThroughDate)}</TableCell>
                    <TableCell>{closing.branch?.name ?? 'Toda la institución'}</TableCell>
                    <TableCell>
                      {closing.targetEquityAccount.code} — {closing.targetEquityAccount.name}
                    </TableCell>
                    <TableCell>{closing.reopenedAt ? 'Reabierto' : 'Activo'}</TableCell>
                    {isSuperadmin && (
                      <TableCell>
                        {!closing.reopenedAt && (
                          <Button variant="outline" size="sm" onClick={() => setReopening(closing)}>
                            Reabrir
                          </Button>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </motion.div>

      <Dialog
        open={!!reopening}
        onOpenChange={(open) => {
          if (!open) {
            setReopening(null);
            setReopenReason('');
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reabrir periodo</DialogTitle>
            <DialogDescription>
              {reopening && `Cerrado hasta ${formatDate(reopening.closedThroughDate)} — indica el motivo de la reapertura.`}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label htmlFor="reopen-reason">Motivo</Label>
            <Input
              id="reopen-reason"
              value={reopenReason}
              onChange={(e) => setReopenReason(e.target.value)}
              maxLength={255}
              placeholder="Ej. Se necesita corregir un gasto mal registrado antes del cierre..."
              autoFocus
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setReopening(null);
                setReopenReason('');
              }}
              disabled={reopenMutation.isPending}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="delete"
              disabled={reopenMutation.isPending || !reopenReason.trim()}
              onClick={() => {
                if (!reopening) return;
                reopenMutation.mutate(
                  { id: reopening.id, reason: reopenReason },
                  {
                    onSuccess: () => {
                      setReopening(null);
                      setReopenReason('');
                    },
                  },
                );
              }}
            >
              {reopenMutation.isPending ? 'Reabriendo...' : 'Reabrir'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
