import { useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { motion, type Variants } from 'framer-motion';
import { Ban, BookOpen, RotateCcw } from 'lucide-react';
import { useJournalEntriesQuery, useVoidJournalEntryMutation } from '@/modules/finanzas';
import { useMeQuery } from '@/modules/security';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { TableSkeletonRows } from '@/components/ui/table-skeleton';
import { Skeleton } from '@/components/ui/skeleton';
import { QueryErrorState } from '@/components/ui/query-error-state';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PageHeader } from '@/components/layout/page-header';
import { useCurrentModuleColor } from '@/components/layout/use-current-module-color';
import { tintBackground, tintForeground } from '@/lib/color';
import { useIsDarkMode } from '@/lib/theme-store';
import { formatDate } from '@/lib/format-date';
import type { JournalEntry } from '@isai/shared-types';

export const Route = createFileRoute('/_authenticated/finance/entries')({
  component: JournalEntriesPage,
});

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' } },
};

function entryTotal(entry: JournalEntry) {
  return entry.lines.reduce((sum, line) => sum + Number(line.debitAmount), 0);
}

function formatAmount(amount: string) {
  return `$${Number(amount).toFixed(2)}`;
}

const SOURCE_LABELS: Record<string, string> = {
  event_fund_collection: 'Colecta de evento',
  project_contribution: 'Aporte de proyecto',
  project_expense: 'Gasto de proyecto',
  group_fund_movement: 'Fondo de grupo',
  journal_entry_void: 'Anulación',
  period_closing: 'Cierre de periodo',
  manual: 'Manual',
};

function StatusBadge({ entry }: { entry: JournalEntry }) {
  if (entry.status === 'void') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 text-xs font-medium text-rose-700 dark:bg-rose-950/40 dark:text-rose-400">
        <Ban className="h-3 w-3" /> Anulado
      </span>
    );
  }
  if (entry.reversesEntryId) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-950/40 dark:text-amber-400">
        <RotateCcw className="h-3 w-3" /> Reversa de anulación
      </span>
    );
  }
  return null;
}

function JournalEntriesPage() {
  const { data: entries, isLoading, isError, refetch } = useJournalEntriesQuery();
  const { data: me } = useMeQuery();
  const color = useCurrentModuleColor();
  const isDark = useIsDarkMode();
  const headStyle = { backgroundColor: tintBackground(color, isDark), color: tintForeground(color, isDark) };
  const [viewingEntry, setViewingEntry] = useState<JournalEntry | null>(null);
  const [showVoided, setShowVoided] = useState(false);
  const [voidingEntry, setVoidingEntry] = useState<JournalEntry | null>(null);
  const [voidReason, setVoidReason] = useState('');

  const canVoid = !!me?.permissions?.includes('finance.journal_entry.delete');
  const visibleEntries = showVoided ? entries : entries?.filter((e) => e.status !== 'void');

  const voidMutation = useVoidJournalEntryMutation();
  const handleConfirmVoid = () => {
    if (!voidingEntry) return;
    voidMutation.mutate(
      { id: voidingEntry.id, reason: voidReason },
      {
        onSuccess: () => {
          setVoidingEntry(null);
          setVoidReason('');
          setViewingEntry(null);
        },
      },
    );
  };

  return (
    <div>
      <PageHeader
        icon={BookOpen}
        title="Asientos Contables"
        description="Movimientos registrados en el libro diario."
      />

      <div className="mt-4 flex justify-end">
        <Button variant="outline" size="sm" onClick={() => setShowVoided((v) => !v)}>
          {showVoided ? 'Ocultar anulados' : 'Mostrar anulados'}
        </Button>
      </div>

      <motion.div initial="hidden" animate="show" variants={fadeUp} className="mt-4">
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
                <QueryErrorState message="No se pudieron cargar los asientos." onRetry={() => refetch()} />
              </div>
            )}

            {!isLoading && !isError && visibleEntries?.length === 0 && (
              <p className="p-4 text-center text-sm text-muted-foreground">Todavía no hay asientos contables.</p>
            )}

            {!isLoading &&
              !isError &&
              visibleEntries?.map((entry) => (
                <button
                  key={entry.id}
                  type="button"
                  className="w-full p-4 text-left hover:bg-muted/50"
                  onClick={() => setViewingEntry(entry)}
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="truncate text-sm font-medium">{entry.description ?? 'Sin descripción'}</p>
                    <span className="shrink-0 text-sm font-semibold">{formatAmount(entryTotal(entry).toString())}</span>
                  </div>
                  <div className="mt-1 flex items-center gap-2">
                    <p className="truncate text-xs text-muted-foreground">
                      {formatDate(entry.entryDate)} · {entry.branch?.name ?? 'Toda la institución'}
                    </p>
                    <StatusBadge entry={entry} />
                  </div>
                </button>
              ))}
          </div>

          {/* Escritorio: tabla. */}
          <div className="hidden max-h-[70vh] overflow-y-auto sm:block">
            <Table>
              <TableHeader className="sticky top-0 z-[1]">
                <TableRow className="hover:bg-transparent">
                  <TableHead style={headStyle}>Fecha</TableHead>
                  <TableHead style={headStyle}>Descripción</TableHead>
                  <TableHead style={headStyle}>Sucursal</TableHead>
                  <TableHead style={headStyle}>Origen</TableHead>
                  <TableHead style={headStyle} className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && <TableSkeletonRows columns={5} />}

                {isError && (
                  <TableRow>
                    <TableCell colSpan={5}>
                      <QueryErrorState message="No se pudieron cargar los asientos." onRetry={() => refetch()} />
                    </TableCell>
                  </TableRow>
                )}

                {!isLoading && !isError && visibleEntries?.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                      Todavía no hay asientos contables.
                    </TableCell>
                  </TableRow>
                )}

                {visibleEntries?.map((entry) => (
                  <TableRow
                    key={entry.id}
                    className="cursor-pointer"
                    onClick={() => setViewingEntry(entry)}
                  >
                    <TableCell>{formatDate(entry.entryDate)}</TableCell>
                    <TableCell className="max-w-xs">
                      <div className="flex items-center gap-2">
                        <span className="truncate">{entry.description ?? '—'}</span>
                        <StatusBadge entry={entry} />
                      </div>
                    </TableCell>
                    <TableCell>{entry.branch?.name ?? 'Toda la institución'}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {entry.sourceType ? (SOURCE_LABELS[entry.sourceType] ?? entry.sourceType) : '—'}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatAmount(entryTotal(entry).toString())}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </motion.div>

      <Dialog open={!!viewingEntry} onOpenChange={(open) => !open && setViewingEntry(null)}>
        <DialogContent>
          <DialogHeader>
            <div className="flex items-center gap-2">
              <DialogTitle>{viewingEntry?.description ?? 'Detalle del asiento'}</DialogTitle>
              {viewingEntry && <StatusBadge entry={viewingEntry} />}
            </div>
            <DialogDescription>
              {viewingEntry && `${formatDate(viewingEntry.entryDate)} · ${viewingEntry.branch?.name ?? 'Toda la institución'}`}
            </DialogDescription>
          </DialogHeader>

          {viewingEntry && (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cuenta</TableHead>
                    <TableHead className="text-right">Debe</TableHead>
                    <TableHead className="text-right">Haber</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {viewingEntry.lines.map((line) => (
                    <TableRow key={line.id}>
                      <TableCell>
                        {line.account.code} · {line.account.name}
                      </TableCell>
                      <TableCell className="text-right">
                        {Number(line.debitAmount) > 0 ? formatAmount(line.debitAmount) : '—'}
                      </TableCell>
                      <TableCell className="text-right">
                        {Number(line.creditAmount) > 0 ? formatAmount(line.creditAmount) : '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {viewingEntry.status === 'void' && viewingEntry.voidReason && (
                <p className="text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">Motivo de la anulación:</span> {viewingEntry.voidReason}
                </p>
              )}

              {canVoid && viewingEntry.status === 'posted' && (
                <DialogFooter>
                  <Button
                    type="button"
                    variant="delete"
                    onClick={() => setVoidingEntry(viewingEntry)}
                  >
                    <Ban className="mr-1.5 h-4 w-4" /> Anular
                  </Button>
                </DialogFooter>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!voidingEntry}
        onOpenChange={(open) => {
          if (!open) {
            setVoidingEntry(null);
            setVoidReason('');
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Anular asiento</DialogTitle>
            <DialogDescription>
              Se generará un asiento de reversa con las mismas líneas invertidas — el original no se
              borra, queda marcado como anulado. Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label htmlFor="void-reason">Motivo</Label>
            <Input
              id="void-reason"
              value={voidReason}
              onChange={(e) => setVoidReason(e.target.value)}
              maxLength={255}
              placeholder="Ej. Monto incorrecto, cuenta equivocada..."
              autoFocus
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setVoidingEntry(null);
                setVoidReason('');
              }}
              disabled={voidMutation.isPending}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="delete"
              onClick={handleConfirmVoid}
              disabled={voidMutation.isPending || !voidReason.trim()}
            >
              {voidMutation.isPending ? 'Anulando...' : 'Anular'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
