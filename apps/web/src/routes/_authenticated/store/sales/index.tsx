import { useEffect, useState } from 'react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { motion, type Variants } from 'framer-motion';
import { ShoppingCart, Plus } from 'lucide-react';
import { useInstitutionsQuery } from '@/modules/general';
import { useSalesQuery } from '@/modules/comercio';
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
import type { Sale } from '@isai/shared-types';

export const Route = createFileRoute('/_authenticated/store/sales/')({
  component: SalesPage,
});

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' } },
};

function saleTotal(sale: Sale) {
  return sale.lines.reduce((sum, line) => sum + Number(line.quantity) * Number(line.unitPrice), 0);
}

function formatAmount(amount: number) {
  return `$${amount.toFixed(2)}`;
}

function SalesPage() {
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

  const { data: sales, isLoading, isError, refetch } = useSalesQuery(institutionId);

  return (
    <div>
      <PageHeader
        icon={ShoppingCart}
        title="Ventas"
        description="Ventas a clientes — se registran completas y se contabilizan de inmediato."
        action={
          <Button variant="translucent" onClick={() => navigate({ to: '/store/sales/new' })} disabled={!institutionId}>
            <Plus className="mr-2 h-4 w-4" />
            Nueva venta
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
                <QueryErrorState message="No se pudieron cargar las ventas." onRetry={() => refetch()} />
              </div>
            )}

            {!isLoading && !isError && sales?.length === 0 && (
              <p className="p-4 text-center text-sm text-muted-foreground">Todavía no hay ventas.</p>
            )}

            {!isLoading &&
              !isError &&
              sales?.map((sale) => (
                <button
                  key={sale.id}
                  type="button"
                  className="w-full p-4 text-left"
                  onClick={() => navigate({ to: '/store/sales/$saleId', params: { saleId: sale.id } })}
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="truncate text-sm font-medium">{sale.customer?.name ?? 'Consumidor Final'}</p>
                    <span className="shrink-0 text-sm font-semibold">{formatAmount(saleTotal(sale))}</span>
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {sale.documentNumber} · {sale.branch.name} · {formatDate(sale.saleDate)}
                  </p>
                </button>
              ))}
          </div>

          {/* Escritorio: tabla. */}
          <div className="hidden max-h-[70vh] overflow-y-auto sm:block">
            <Table>
              <TableHeader className="sticky top-0 z-[1]">
                <TableRow className="hover:bg-transparent">
                  <TableHead style={headStyle}>Folio</TableHead>
                  <TableHead style={headStyle}>Cliente</TableHead>
                  <TableHead style={headStyle}>Sucursal</TableHead>
                  <TableHead style={headStyle}>Fecha</TableHead>
                  <TableHead style={headStyle} className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && <TableSkeletonRows columns={5} />}

                {isError && (
                  <TableRow>
                    <TableCell colSpan={5}>
                      <QueryErrorState message="No se pudieron cargar las ventas." onRetry={() => refetch()} />
                    </TableCell>
                  </TableRow>
                )}

                {!isLoading && !isError && sales?.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                      Todavía no hay ventas.
                    </TableCell>
                  </TableRow>
                )}

                {sales?.map((sale) => (
                  <TableRow
                    key={sale.id}
                    className="cursor-pointer"
                    onClick={() => navigate({ to: '/store/sales/$saleId', params: { saleId: sale.id } })}
                  >
                    <TableCell className="font-mono text-xs">{sale.documentNumber}</TableCell>
                    <TableCell className="font-medium">{sale.customer?.name ?? 'Consumidor Final'}</TableCell>
                    <TableCell>{sale.branch.name}</TableCell>
                    <TableCell>{formatDate(sale.saleDate)}</TableCell>
                    <TableCell className="text-right font-medium">{formatAmount(saleTotal(sale))}</TableCell>
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
