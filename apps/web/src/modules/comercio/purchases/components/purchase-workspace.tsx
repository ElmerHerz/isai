import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { motion, type Variants } from 'framer-motion';
import { Receipt, Plus, Trash2, Landmark, CheckCircle2, Clock } from 'lucide-react';
import {
  usePurchaseQuery,
  useRemovePurchaseLineMutation,
  usePostPurchaseToLedgerMutation,
  useRemovePurchaseMutation,
} from '@/modules/comercio';
import { AddPurchaseLineDialog } from '@/modules/comercio/purchases/components/add-purchase-line-dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { QueryErrorState } from '@/components/ui/query-error-state';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { PageHeader } from '@/components/layout/page-header';
import { formatDate } from '@/lib/format-date';
import { cn } from '@/lib/utils';

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' } },
};

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  cash: 'Contado',
  transfer: 'Transferencia',
  credit: 'Crédito',
};

function formatAmount(amount: number) {
  return `$${amount.toFixed(2)}`;
}

interface PurchaseWorkspaceProps {
  purchaseId: string;
}

// Encabezado + líneas + Contabilizar/Eliminar de una compra — extraído para
// que tanto la ruta de detalle ($purchaseId.tsx) como la de creación
// (new.tsx, sin modal, todo en una sola pantalla) compartan exactamente la
// misma UI de líneas una vez que el encabezado ya existe en la base.
export function PurchaseWorkspace({ purchaseId }: PurchaseWorkspaceProps) {
  const navigate = useNavigate();
  const { data: purchase, isLoading, isError, refetch } = usePurchaseQuery(purchaseId);
  const [addLineOpen, setAddLineOpen] = useState(false);
  const [removingLineId, setRemovingLineId] = useState<string | null>(null);
  const [posting, setPosting] = useState(false);
  const [removing, setRemoving] = useState(false);

  const removeLineMutation = useRemovePurchaseLineMutation(purchaseId);
  const postMutation = usePostPurchaseToLedgerMutation(purchaseId);
  const removeMutation = useRemovePurchaseMutation(purchase?.institutionId ?? '');

  if (isLoading) {
    return (
      <div>
        <Skeleton className="h-10 w-64" />
        <Skeleton className="mt-4 h-48 w-full" />
      </div>
    );
  }

  if (isError || !purchase) {
    return <QueryErrorState message="No se pudo cargar la compra." onRetry={() => refetch()} />;
  }

  const isPosted = !!purchase.journalEntryId;
  const total = purchase.lines.reduce((sum, line) => sum + Number(line.quantity) * Number(line.unitCost), 0);

  return (
    <div>
      <PageHeader
        icon={Receipt}
        title={purchase.supplier.name}
        description={[
          purchase.branch.name,
          formatDate(purchase.purchaseDate),
          purchase.paymentMethod ? PAYMENT_METHOD_LABELS[purchase.paymentMethod] : null,
          purchase.supplierDocumentNumber ? `Factura ${purchase.supplierDocumentNumber}` : null,
        ]
          .filter(Boolean)
          .join(' · ')}
        action={
          <span
            className={cn(
              'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium',
              isPosted
                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
                : 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400',
            )}
          >
            {isPosted ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Clock className="h-3.5 w-3.5" />}
            {isPosted ? 'Contabilizada' : 'Pendiente de contabilizar'}
          </span>
        }
      />

      {purchase.notes && <p className="mt-4 text-sm text-muted-foreground">{purchase.notes}</p>}

      <motion.div initial="hidden" animate="show" variants={fadeUp} className="mt-6">
        <Card className="rounded-2xl">
          <CardContent className="p-4">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-semibold">Líneas de la compra</h2>
              {!isPosted && (
                <Button variant="outline" size="sm" onClick={() => setAddLineOpen(true)}>
                  <Plus className="mr-1.5 h-4 w-4" /> Agregar línea
                </Button>
              )}
            </div>

            {purchase.lines.length === 0 ? (
              <p className="text-sm text-muted-foreground">Todavía no hay líneas — agrega un producto arriba.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Producto</TableHead>
                    <TableHead className="text-right">Cantidad</TableHead>
                    <TableHead className="text-right">Costo unitario</TableHead>
                    <TableHead className="text-right">Subtotal</TableHead>
                    {!isPosted && <TableHead className="w-10" />}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {purchase.lines.map((line) => (
                    <TableRow key={line.id}>
                      <TableCell>
                        {line.product.sku ? `${line.product.sku} · ${line.product.name}` : line.product.name}
                      </TableCell>
                      <TableCell className="text-right">{line.quantity}</TableCell>
                      <TableCell className="text-right">{formatAmount(Number(line.unitCost))}</TableCell>
                      <TableCell className="text-right">
                        {formatAmount(Number(line.quantity) * Number(line.unitCost))}
                      </TableCell>
                      {!isPosted && (
                        <TableCell>
                          <Button variant="ghost" size="icon" onClick={() => setRemovingLineId(line.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                  <TableRow className="hover:bg-transparent">
                    <TableCell colSpan={3} className="text-right font-semibold">
                      Total
                    </TableCell>
                    <TableCell className="text-right font-semibold">{formatAmount(total)}</TableCell>
                    {!isPosted && <TableCell />}
                  </TableRow>
                </TableBody>
              </Table>
            )}

            {!isPosted && (
              <div className="mt-4 flex flex-wrap justify-end gap-2">
                <Button variant="outline" onClick={() => setRemoving(true)}>
                  <Trash2 className="mr-1.5 h-4 w-4" /> Eliminar compra
                </Button>
                <Button onClick={() => setPosting(true)} disabled={purchase.lines.length === 0}>
                  <Landmark className="mr-1.5 h-4 w-4" /> Contabilizar
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      <AddPurchaseLineDialog open={addLineOpen} onOpenChange={setAddLineOpen} purchaseId={purchaseId} />

      <ConfirmDialog
        open={!!removingLineId}
        onOpenChange={(open) => !open && setRemovingLineId(null)}
        title="¿Quitar esta línea?"
        description="Se elimina de la compra — no afecta ninguna existencia ya movida."
        isPending={removeLineMutation.isPending}
        onConfirm={() => {
          if (removingLineId) {
            removeLineMutation.mutate(removingLineId, { onSuccess: () => setRemovingLineId(null) });
          }
        }}
      />

      <ConfirmDialog
        open={posting}
        onOpenChange={setPosting}
        title="Contabilizar compra"
        confirmLabel="Contabilizar"
        pendingLabel="Contabilizando..."
        description={`Esto mueve la existencia de las ${purchase.lines.length} línea(s) y genera el asiento contable por ${formatAmount(total)} (debe Inventario, haber ${purchase.paymentMethod === 'credit' ? 'Cuentas por Pagar' : 'Caja'}). No se puede deshacer.`}
        isPending={postMutation.isPending}
        onConfirm={() => postMutation.mutate(undefined, { onSuccess: () => setPosting(false) })}
      />

      <ConfirmDialog
        open={removing}
        onOpenChange={setRemoving}
        title="Eliminar compra"
        description="Esto elimina la compra y todas sus líneas. No se puede deshacer."
        isPending={removeMutation.isPending}
        onConfirm={() =>
          removeMutation.mutate(purchaseId, { onSuccess: () => navigate({ to: '/store/purchases' }) })
        }
      />
    </div>
  );
}
