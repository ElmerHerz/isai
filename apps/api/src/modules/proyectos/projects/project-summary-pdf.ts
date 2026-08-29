import {
  renderPdfToBuffer,
  drawDocumentHeader,
  drawKeyValueBlock,
  drawTable,
  drawFooterNote,
} from '../../../common/pdf/pdf-builder';
import type { Prisma } from '@prisma/client';
import type { ProjectsService } from './projects.service';

type SummaryData = Awaited<ReturnType<ProjectsService['buildSummaryPdfData']>>;

function formatAmount(amount: string | number | Prisma.Decimal) {
  return `$${Number(amount).toFixed(2)}`;
}

// Mismo nivel de detalle que buildSummaryWorkbook (el Excel de 6 hojas), en
// secciones en vez de hojas — formato propio, no una tabla de Excel
// convertida a PDF (ver plan de sesión).
export function buildProjectSummaryPdf(data: SummaryData): Promise<Buffer> {
  return renderPdfToBuffer((doc) => {
    drawDocumentHeader(doc, {
      institutionName: data.institutionName,
      documentTitle: `Resumen del Proyecto: ${data.project.name}`,
      generatedAt: new Date(),
    });

    drawKeyValueBlock(doc, [
      ['Meta', formatAmount(data.goalAmount)],
      ['Recaudado', formatAmount(data.totalContributed)],
      ['Gastado', formatAmount(data.totalSpent)],
      ['Disponible', formatAmount(data.totalContributed - data.totalSpent)],
      ['% de avance hacia la meta', `${(data.percent * 100).toFixed(1)}%`],
      ...(data.daysRemaining !== null
        ? ([['Días restantes', data.daysRemaining >= 0 ? String(data.daysRemaining) : 'Vencido']] as [string, string][])
        : []),
    ]);

    doc.fontSize(12).font('Helvetica-Bold').text('Top aportantes');
    doc.moveDown(0.3);
    drawTable(
      doc,
      [
        { key: 'name', header: 'Aportante', width: 220 },
        { key: 'count', header: '# Aportes', width: 80, align: 'right' },
        { key: 'total', header: 'Monto total', width: 150, align: 'right' },
      ],
      data.contributorRanking
        .slice(0, 15)
        .map((c) => ({ name: c.name, count: String(c.count), total: formatAmount(c.total) })),
    );

    doc.addPage();
    doc.fontSize(12).font('Helvetica-Bold').text('Detalle de aportes');
    doc.moveDown(0.3);
    drawTable(
      doc,
      [
        { key: 'date', header: 'Fecha', width: 80 },
        { key: 'who', header: 'Aportante', width: 180 },
        { key: 'amount', header: 'Monto', width: 90, align: 'right' },
        { key: 'posted', header: 'Contabilizado', width: 100, align: 'center' },
      ],
      data.sortedContributions.map((c) => ({
        date: c.contributedAt.toISOString().slice(0, 10),
        who: c.contributorName,
        amount: formatAmount(c.amount),
        posted: c.journalEntryId ? 'Sí' : 'No',
      })),
    );

    doc.addPage();
    doc.fontSize(12).font('Helvetica-Bold').text('Detalle de gastos');
    doc.moveDown(0.3);
    drawTable(
      doc,
      [
        { key: 'date', header: 'Fecha', width: 75 },
        { key: 'account', header: 'Cuenta', width: 160 },
        { key: 'amount', header: 'Monto', width: 90, align: 'right' },
        { key: 'posted', header: 'Contabilizado', width: 90, align: 'center' },
        { key: 'doc', header: 'Folio', width: 80 },
      ],
      data.sortedExpenses.map((e) => ({
        date: e.incurredAt.toISOString().slice(0, 10),
        account: `${e.account.code} · ${e.account.name}`,
        amount: formatAmount(e.amount),
        posted: e.journalEntryId ? 'Sí' : 'No',
        doc: e.documentNumber ?? '—',
      })),
    );

    drawFooterNote(doc, 'Resumen generado desde ISAI — incluye aportes y gastos contabilizados y pendientes de contabilizar.');
  });
}
