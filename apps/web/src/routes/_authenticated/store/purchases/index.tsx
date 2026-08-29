import { useEffect, useState } from 'react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { motion, type Variants } from 'framer-motion';
import { Receipt, Plus, CheckCircle2, Clock } from 'lucide-react';
import { useInstitutionsQuery } from '@/modules/general';
import { usePurchasesQuery } from '@/modules/comercio';
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
import { cn } from '@/lib/utils';
import type { Purchase } from '@isai/shared-types';

export const Route = createFileRoute('/_authenticated/store/purchases/')({
  component: PurchasesPage,
});

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' } },
};

function purchaseTotal(purchase: Purchase) {
  return purchase.lines.reduce((sum, line) => sum + Number(line.quantity) * Number(line.unitCost), 0);
}

function formatAmount(amount: number) {
  return `$${amount.toFixed(2)}`;
}

function PurchasesPage() {
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

  const { data: purchases, isLoading, isError, refetch } = usePurchasesQuery(institutionId);

  return (
    <div>
      <PageHeader
        icon={Receipt}
        title="Compras"
        description="Compras a proveedores — registra el encabezado, agrega líneas y contabiliza."
        action={
          <Button variant="translucent" onClick={() => navigate({ to: '/store/purchases/new' })} disabled={!institutionId}>
            <Plus className="mr-2 h-4 w-4" />
            Nueva compra
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
                <QueryErrorState message="No se pudieron cargar las compras." onRetry={() => refetch()} />
              </div>
            )}

            {!isLoading && !isError && purchases?.length === 0 && (
              <p className="p-4 text-center text-sm text-muted-foreground">Todavía no hay compras.</p>
            )}

            {!isLoading &&
              !isError &&
              purchases?.map((purchase) => (
                <button
                  key={purchase.id}
                  type="button"
                  className="w-full p-4 text-left"
                  onClick={() => navigate({ to: '/store/purchases/$purchaseId', params: { purchaseId: purchase.id } })}
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="truncate text-sm font-medium">{purchase.supplier.name}</p>
                    <span className="shrink-0 text-sm font-semibold">{formatAmount(purchaseTotal(purchase))}</span>
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {purchase.branch.name} · {formatDate(purchase.purchaseDate)}
                  </p>
                </button>
              ))}
          </div>

          {/* Escritorio: tabla. */}
          <div className="hidden max-h-[70vh] overflow-y-auto sm:block">
            <Table>
              <TableHeader className="sticky top-0 z-[1]">
                <TableRow className="hover:bg-transparent">
                  <TableHead style={headStyle}>Proveedor</TableHead>
                  <TableHead style={headStyle}>Sucursal</TableHead>
                  <TableHead style={headStyle}>Fecha</TableHead>
                  <TableHead style={headStyle} className="text-right">Total</TableHead>
                  <TableHead style={headStyle}>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && <TableSkeletonRows columns={5} />}

                {isError && (
                  <TableRow>
                    <TableCell colSpan={5}>
                      <QueryErrorState message="No se pudieron cargar las compras." onRetry={() => refetch()} />
                    </TableCell>
                  </TableRow>
                )}

                {!isLoading && !isError && purchases?.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                      Todavía no hay compras.
                    </TableCell>
                  </TableRow>
                )}

                {purchases?.map((purchase) => (
                  <TableRow
                    key={purchase.id}
                    className="cursor-pointer"
                    onClick={() => navigate({ to: '/store/purchases/$purchaseId', params: { purchaseId: purchase.id } })}
                  >
                    <TableCell className="font-medium">{purchase.supplier.name}</TableCell>
                    <TableCell>{purchase.branch.name}</TableCell>
                    <TableCell>{formatDate(purchase.purchaseDate)}</TableCell>
                    <TableCell className="text-right font-medium">{formatAmount(purchaseTotal(purchase))}</TableCell>
                    <TableCell>
                      <span
                        className={cn(
                          'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
                          purchase.journalEntryId
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
                            : 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400',
                        )}
                      >
                        {purchase.journalEntryId ? (
                          <CheckCircle2 className="h-3.5 w-3.5" />
                        ) : (
                          <Clock className="h-3.5 w-3.5" />
                        )}
                        {purchase.journalEntryId ? 'Contabilizada' : 'Pendiente'}
                      </span>
                    </TableCell>
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
