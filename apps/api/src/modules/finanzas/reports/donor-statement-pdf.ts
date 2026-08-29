import { renderPdfToBuffer, drawDocumentHeader, drawKeyValueBlock, drawTable, drawFooterNote } from '../../../common/pdf/pdf-builder';
import type { DonorStatement } from './reports.service';

// Formato propio de este documento — deliberadamente distinto de cualquier
// otro comprobante (ver plan de sesión: sin plantilla única compartida,
// cada tipo de documento arma su layout con las piezas del builder).
export function buildDonorStatementPdf(statement: DonorStatement, institutionName: string): Promise<Buffer> {
  if (!statement.receipt) {
    throw new Error('buildDonorStatementPdf requiere un comprobante ya registrado (con folio).');
  }

  return renderPdfToBuffer((doc) => {
    drawDocumentHeader(doc, {
      institutionName,
      documentTitle: `Comprobante de Donación ${statement.year}`,
      documentNumber: statement.receipt!.documentNumber,
      generatedAt: new Date(statement.receipt!.generatedAt),
    });

    drawKeyValueBlock(doc, [
      ['Donante', `${statement.person.firstName} ${statement.person.lastName}`],
      ['Periodo', `1 de enero – 31 de diciembre de ${statement.year}`],
      ['Total donado', `$${Number(statement.totalDonated).toFixed(2)}`],
    ]);

    drawTable(
      doc,
      [
        { key: 'date', header: 'Fecha', width: 90 },
        { key: 'description', header: 'Concepto', width: 320 },
        { key: 'amount', header: 'Monto', width: 90, align: 'right' },
      ],
      statement.lines.map((l) => ({
        date: l.date,
        description: l.description,
        amount: `$${Number(l.amount).toFixed(2)}`,
      })),
    );

    drawFooterNote(
      doc,
      'Este comprobante certifica las donaciones registradas en el sistema durante el periodo indicado. ' +
        'Consérvelo para efectos fiscales.',
    );
  });
}
