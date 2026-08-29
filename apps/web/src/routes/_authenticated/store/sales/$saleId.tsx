import { createFileRoute, Link } from '@tanstack/react-router';
import { motion, type Variants } from 'framer-motion';
import { ArrowLeft, ShoppingCart, Download } from 'lucide-react';
import { useSaleQuery, useDownloadSaleInvoicePdf } from '@/modules/comercio';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { QueryErrorState } from '@/components/ui/query-error-state';
import { PageHeader } from '@/components/layout/page-header';
import { formatDate } from '@/lib/format-date';

export const Route = createFileRoute('/_authenticated/store/sales/$saleId')({
  component: SaleDetailPage,
});

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' } },
};

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  cash: 'Contado',
  transfer: 'Transferencia',
  card: 'Tarjeta',
  credit: 'Crédito',
};

const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  invoice: 'Factura',
  receipt: 'Recibo',
};

function formatAmount(amount: number) {
  return `$${amount.toFixed(2)}`;
}

// Solo lectura — una Venta nace atómica y ya contabilizada, sin acciones de
// editar líneas ni "Contabilizar" (a diferencia de Purchase/PurchaseWorkspace).
function SaleDetailPage() {
  const { saleId } = Route.useParams();
  const { data: sale, isLoading, isError, refetch } = useSaleQuery(saleId);
  const { download, isDownloading } = useDownloadSaleInvoicePdf();

  if (isLoading) {
    return (
      <div>
        <Skeleton className="h-10 w-64" />
        <Skeleton className="mt-4 h-48 w-full" />
      </div>
    );
  }

  if (isError || !sale) {
    return <QueryErrorState message="No se pudo cargar la venta." onRetry={() => refetch()} />;
  }

  const total = sale.lines.reduce((sum, line) => sum + Number(line.quantity) * Number(line.unitPrice), 0);

  return (
    <div>
      <Link to="/store/sales" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Ventas
      </Link>

      <PageHeader
        icon={ShoppingCart}
        title={sale.customer?.name ?? 'Consumidor Final'}
        description={[
          sale.documentNumber,
          DOCUMENT_TYPE_LABELS[sale.documentType],
          sale.branch.name,
          formatDate(sale.saleDate),
          PAYMENT_METHOD_LABELS[sale.paymentMethod],
        ]
          .filter(Boolean)
          .join(' · ')}
        action={
          <Button
            variant="translucent"
            onClick={() => download(sale.id, sale.documentNumber)}
            disabled={isDownloading}
          >
            <Download className="mr-2 h-4 w-4" />
            {isDownloading ? 'Descargando...' : 'Descargar PDF'}
          </Button>
        }
      />

      {sale.notes && <p className="mt-4 text-sm text-muted-foreground">{sale.notes}</p>}

      <motion.div initial="hidden" animate="show" variants={fadeUp} className="mt-6">
        <Card className="rounded-2xl">
          <CardContent className="p-4">
            <h2 className="mb-4 text-sm font-semibold">Líneas de la venta</h2>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Producto</TableHead>
                  <TableHead className="text-right">Cantidad</TableHead>
                  <TableHead className="text-right">Precio</TableHead>
                  <TableHead className="text-right">Subtotal</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sale.lines.map((line) => (
                  <TableRow key={line.id}>
                    <TableCell>
                      {line.product.sku ? `${line.product.sku} · ${line.product.name}` : line.product.name}
                    </TableCell>
                    <TableCell className="text-right">{line.quantity}</TableCell>
                    <TableCell className="text-right">{formatAmount(Number(line.unitPrice))}</TableCell>
                    <TableCell className="text-right">
                      {formatAmount(Number(line.quantity) * Number(line.unitPrice))}
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={3} className="text-right font-semibold">
                    Total
                  </TableCell>
                  <TableCell className="text-right font-semibold">{formatAmount(total)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
