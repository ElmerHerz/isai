import { useEffect, useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { motion, type Variants } from 'framer-motion';
import { BarChart3, TrendingUp, Boxes } from 'lucide-react';
import { useInstitutionsQuery } from '@/modules/general';
import { useProductMarginQuery, useInventoryValuationQuery } from '@/modules/comercio';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { QueryErrorState } from '@/components/ui/query-error-state';
import { CollapsibleSection } from '@/components/ui/collapsible-section';
import { DateInput } from '@/components/ui/date-input';
import { Label } from '@/components/ui/label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { PageHeader } from '@/components/layout/page-header';
import { cn } from '@/lib/utils';

export const Route = createFileRoute('/_authenticated/store/reports')({
  component: StoreReportsPage,
});

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' } },
};

const todayISO = () => new Date().toISOString().slice(0, 10);
const startOfMonthISO = () => `${new Date().toISOString().slice(0, 7)}-01`;

function formatAmount(amount: string | number) {
  return `$${Number(amount).toFixed(2)}`;
}

function StoreReportsPage() {
  const { data: institutions } = useInstitutionsQuery();
  const [institutionId, setInstitutionId] = useState('');

  useEffect(() => {
    if (!institutionId && institutions?.length) {
      setInstitutionId(institutions[0]!.id);
    }
  }, [institutions, institutionId]);

  const [marginStart, setMarginStart] = useState(startOfMonthISO());
  const [marginEnd, setMarginEnd] = useState(todayISO());
  const { data: marginRows, isLoading: marginLoading, isError: marginError, refetch: refetchMargin } =
    useProductMarginQuery(institutionId, marginStart, marginEnd);

  const { data: valuationRows, isLoading: valuationLoading, isError: valuationError, refetch: refetchValuation } =
    useInventoryValuationQuery(institutionId);

  const marginTotals = (marginRows ?? []).reduce(
    (acc, r) => ({ revenue: acc.revenue + Number(r.revenue), cost: acc.cost + Number(r.cost), margin: acc.margin + Number(r.margin) }),
    { revenue: 0, cost: 0, margin: 0 },
  );
  const valuationTotal = (valuationRows ?? []).reduce((sum, r) => sum + Number(r.value), 0);

  return (
    <div>
      <PageHeader
        icon={BarChart3}
        title="Reportes"
        description="Margen por producto y valorización de inventario."
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

      {/* --- Margen por producto --- */}
      <motion.div initial="hidden" animate="show" variants={fadeUp} className="mt-6">
        <Card className="rounded-2xl">
          <CardContent className="p-4">
            <CollapsibleSection icon={TrendingUp} title="Margen por producto" defaultOpen>
              <div className="mb-4 flex flex-wrap items-end gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="margin-start">Desde</Label>
                  <DateInput id="margin-start" value={marginStart} onChange={setMarginStart} max={marginEnd} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="margin-end">Hasta</Label>
                  <DateInput id="margin-end" value={marginEnd} onChange={setMarginEnd} min={marginStart} max={todayISO()} />
                </div>
              </div>

              {marginLoading ? (
                <Skeleton className="h-40 w-full" />
              ) : marginError ? (
                <QueryErrorState message="No se pudo cargar el margen por producto." onRetry={() => refetchMargin()} />
              ) : marginRows?.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sin ventas en este rango.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Producto</TableHead>
                      <TableHead className="text-right">Cantidad</TableHead>
                      <TableHead className="text-right">Ingreso</TableHead>
                      <TableHead className="text-right">Costo</TableHead>
                      <TableHead className="text-right">Margen</TableHead>
                      <TableHead className="text-right">Margen %</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {marginRows?.map((row) => (
                      <TableRow key={row.productId}>
                        <TableCell>{row.sku ? `${row.sku} · ${row.name}` : row.name}</TableCell>
                        <TableCell className="text-right">{row.quantitySold}</TableCell>
                        <TableCell className="text-right">{formatAmount(row.revenue)}</TableCell>
                        <TableCell className="text-right">{formatAmount(row.cost)}</TableCell>
                        <TableCell
                          className={cn(
                            'text-right font-medium',
                            Number(row.margin) >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400',
                          )}
                        >
                          {formatAmount(row.margin)}
                        </TableCell>
                        <TableCell className="text-right">{Number(row.marginPercent).toFixed(1)}%</TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="hover:bg-transparent">
                      <TableCell colSpan={2} className="text-right font-semibold">Total</TableCell>
                      <TableCell className="text-right font-semibold">{formatAmount(marginTotals.revenue)}</TableCell>
                      <TableCell className="text-right font-semibold">{formatAmount(marginTotals.cost)}</TableCell>
                      <TableCell className="text-right font-semibold">{formatAmount(marginTotals.margin)}</TableCell>
                      <TableCell className="text-right font-semibold">
                        {marginTotals.revenue === 0 ? '—' : `${((marginTotals.margin / marginTotals.revenue) * 100).toFixed(1)}%`}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              )}
            </CollapsibleSection>
          </CardContent>
        </Card>
      </motion.div>

      {/* --- Valorización de inventario --- */}
      <motion.div initial="hidden" animate="show" variants={fadeUp} className="mt-4">
        <Card className="rounded-2xl">
          <CardContent className="p-4">
            <CollapsibleSection icon={Boxes} title="Valorización de inventario" defaultOpen={false}>
              <p className="mb-4 text-xs text-muted-foreground">Existencia actual, a costo promedio — no es un rango de fechas.</p>

              {valuationLoading ? (
                <Skeleton className="h-40 w-full" />
              ) : valuationError ? (
                <QueryErrorState message="No se pudo cargar la valorización de inventario." onRetry={() => refetchValuation()} />
              ) : valuationRows?.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sin existencia registrada.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Producto</TableHead>
                      <TableHead className="text-right">Existencia</TableHead>
                      <TableHead className="text-right">Costo promedio</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {valuationRows?.map((row) => (
                      <TableRow key={row.productId}>
                        <TableCell>{row.sku ? `${row.sku} · ${row.name}` : row.name}</TableCell>
                        <TableCell className="text-right">{row.quantity} {row.unitCode}</TableCell>
                        <TableCell className="text-right">{formatAmount(row.averageCost)}</TableCell>
                        <TableCell className="text-right">{formatAmount(row.value)}</TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="hover:bg-transparent">
                      <TableCell colSpan={3} className="text-right font-semibold">Valor total del inventario</TableCell>
                      <TableCell className="text-right font-semibold">{formatAmount(valuationTotal)}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              )}
            </CollapsibleSection>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
