import { createFileRoute } from '@tanstack/react-router';
import { motion, type Variants } from 'framer-motion';
import { BarChart3 } from 'lucide-react';
import { useFundSummaryQuery } from '@/modules/finanzas';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { TableSkeletonRows } from '@/components/ui/table-skeleton';
import { Skeleton } from '@/components/ui/skeleton';
import { QueryErrorState } from '@/components/ui/query-error-state';
import { PageHeader } from '@/components/layout/page-header';
import { useCurrentModuleColor } from '@/components/layout/use-current-module-color';
import { tintBackground, tintForeground } from '@/lib/color';
import { useIsDarkMode } from '@/lib/theme-store';

export const Route = createFileRoute('/_authenticated/finance/reports')({
  component: ReportsPage,
});

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' } },
};

function formatAmount(amount: string) {
  return `$${Number(amount).toFixed(2)}`;
}

function ReportsPage() {
  const { data: rows, isLoading, isError, refetch } = useFundSummaryQuery();
  const color = useCurrentModuleColor();
  const isDark = useIsDarkMode();
  const headStyle = { backgroundColor: tintBackground(color, isDark), color: tintForeground(color, isDark) };

  return (
    <div>
      <PageHeader
        icon={BarChart3}
        title="Reportes"
        description="Totales contabilizados por sucursal y grupo. Solo asientos ya contabilizados (posted)."
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
                <QueryErrorState message="No se pudo cargar el reporte." onRetry={() => refetch()} />
              </div>
            )}

            {!isLoading && !isError && rows?.length === 0 && (
              <p className="p-4 text-center text-sm text-muted-foreground">
                Todavía no hay movimientos contabilizados.
              </p>
            )}

            {!isLoading &&
              !isError &&
              rows?.map((row, i) => (
                <div key={i} className="p-4">
                  <p className="text-sm font-medium">{row.account}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {row.branch} · {row.group}
                  </p>
                  <div className="mt-2 flex gap-4 text-sm">
                    <span>Debe: {formatAmount(row.totalDebit)}</span>
                    <span>Haber: {formatAmount(row.totalCredit)}</span>
                  </div>
                </div>
              ))}
          </div>

          {/* Escritorio: tabla. */}
          <div className="hidden max-h-[70vh] overflow-y-auto sm:block">
            <Table>
              <TableHeader className="sticky top-0 z-[1]">
                <TableRow className="hover:bg-transparent">
                  <TableHead style={headStyle}>Sucursal</TableHead>
                  <TableHead style={headStyle}>Grupo</TableHead>
                  <TableHead style={headStyle}>Cuenta</TableHead>
                  <TableHead style={headStyle} className="text-right">Debe</TableHead>
                  <TableHead style={headStyle} className="text-right">Haber</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && <TableSkeletonRows columns={5} />}

                {isError && (
                  <TableRow>
                    <TableCell colSpan={5}>
                      <QueryErrorState message="No se pudo cargar el reporte." onRetry={() => refetch()} />
                    </TableCell>
                  </TableRow>
                )}

                {!isLoading && !isError && rows?.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                      Todavía no hay movimientos contabilizados.
                    </TableCell>
                  </TableRow>
                )}

                {rows?.map((row, i) => (
                  <TableRow key={i}>
                    <TableCell>{row.branch}</TableCell>
                    <TableCell>{row.group}</TableCell>
                    <TableCell>{row.account}</TableCell>
                    <TableCell className="text-right">{formatAmount(row.totalDebit)}</TableCell>
                    <TableCell className="text-right">{formatAmount(row.totalCredit)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
