import { renderPdfToBuffer, drawDocumentHeader, drawKeyValueBlock, drawTable, drawFooterNote } from '../../../common/pdf/pdf-builder';
import type { Prisma } from '@prisma/client';

type SaleWithLines = Prisma.SaleGetPayload<{
  include: {
    branch: { select: { id: true; name: true } };
    customer: { select: { id: true; name: true } };
    lines: { include: { product: { select: { id: true; name: true; sku: true } } } };
  };
}>;

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  cash: 'Contado',
  transfer: 'Transferencia',
  card: 'Tarjeta',
  credit: 'Crédito',
};

const DOCUMENT_TITLES: Record<string, string> = {
  invoice: 'Factura',
  receipt: 'Recibo',
};

// Formato propio de este documento — deliberadamente distinto de
// donor-statement-pdf.ts (ver plan de sesión: sin plantilla única
// compartida, cada tipo de documento arma su layout con las piezas de
// common/pdf/pdf-builder.ts).
export function buildSaleInvoicePdf(sale: SaleWithLines, institutionName: string): Promise<Buffer> {
  return renderPdfToBuffer((doc) => {
    drawDocumentHeader(doc, {
      institutionName,
      documentTitle: DOCUMENT_TITLES[sale.documentType] ?? 'Comprobante',
      documentNumber: sale.documentNumber,
      generatedAt: new Date(),
    });

    drawKeyValueBlock(doc, [
      ['Cliente', sale.customer?.name ?? 'Consumidor Final'],
      ['Fecha', sale.saleDate.toISOString().slice(0, 10)],
      ['Sucursal', sale.branch.name],
      ['Forma de pago', PAYMENT_METHOD_LABELS[sale.paymentMethod] ?? sale.paymentMethod],
    ]);

    drawTable(
      doc,
      [
        { key: 'product', header: 'Producto', width: 260 },
        { key: 'quantity', header: 'Cantidad', width: 70, align: 'right' },
        { key: 'unitPrice', header: 'Precio', width: 80, align: 'right' },
        { key: 'subtotal', header: 'Subtotal', width: 90, align: 'right' },
      ],
      sale.lines.map((line) => ({
        product: line.product.sku ? `${line.product.sku} · ${line.product.name}` : line.product.name,
        quantity: line.quantity.toString(),
        unitPrice: `$${Number(line.unitPrice).toFixed(2)}`,
        subtotal: `$${(Number(line.quantity) * Number(line.unitPrice)).toFixed(2)}`,
      })),
    );

    const total = sale.lines.reduce((sum, line) => sum + Number(line.quantity) * Number(line.unitPrice), 0);
    drawFooterNote(doc, `Total: $${total.toFixed(2)}`);
  });
}
