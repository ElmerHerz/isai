import { useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { motion, type Variants } from 'framer-motion';
import { BookOpen } from 'lucide-react';
import { useJournalEntriesQuery } from '@/modules/finanzas';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { TableSkeletonRows } from '@/components/ui/table-skeleton';
import { Skeleton } from '@/components/ui/skeleton';
import { QueryErrorState } from '@/components/ui/query-error-state';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
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
  manual: 'Manual',
};

function JournalEntriesPage() {
  const { data: entries, isLoading, isError, refetch } = useJournalEntriesQuery();
  const color = useCurrentModuleColor();
  const isDark = useIsDarkMode();
  const headStyle = { backgroundColor: tintBackground(color, isDark), color: tintForeground(color, isDark) };
  const [viewingEntry, setViewingEntry] = useState<JournalEntry | null>(null);

  return (
    <div>
      <PageHeader
        icon={BookOpen}
        title="Asientos Contables"
        description="Movimientos registrados en el libro diario."
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
                <QueryErrorState message="No se pudieron cargar los asientos." onRetry={() => refetch()} />
              </div>
            )}

            {!isLoading && !isError && entries?.length === 0 && (
              <p className="p-4 text-center text-sm text-muted-foreground">Todavía no hay asientos contables.</p>
            )}

            {!isLoading &&
              !isError &&
              entries?.map((entry) => (
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
                  <p className="mt-1 text-xs text-muted-foreground">
                    {formatDate(entry.entryDate)} · {entry.branch?.name ?? 'Toda la institución'}
                  </p>
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

                {!isLoading && !isError && entries?.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                      Todavía no hay asientos contables.
                    </TableCell>
                  </TableRow>
                )}

                {entries?.map((entry) => (
                  <TableRow
                    key={entry.id}
                    className="cursor-pointer"
                    onClick={() => setViewingEntry(entry)}
                  >
                    <TableCell>{formatDate(entry.entryDate)}</TableCell>
                    <TableCell className="max-w-xs truncate">{entry.description ?? '—'}</TableCell>
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
            <DialogTitle>{viewingEntry?.description ?? 'Detalle del asiento'}</DialogTitle>
            <DialogDescription>
              {viewingEntry && `${formatDate(viewingEntry.entryDate)} · ${viewingEntry.branch?.name ?? 'Toda la institución'}`}
            </DialogDescription>
          </DialogHeader>

          {viewingEntry && (
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
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
