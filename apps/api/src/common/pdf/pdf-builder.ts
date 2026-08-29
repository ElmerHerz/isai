import PDFDocument from 'pdfkit';

// Caja de herramientas compartida para generar PDFs — NO es una plantilla
// única: cada tipo de documento (comprobante de donante hoy; voucher de
// gasto, hoja de asistencia, recibo de ingreso más adelante) arma su propio
// layout llamando a estas piezas con sus propios datos, deliberadamente
// distinto entre sí (decisión explícita de sesión: sin editor de plantillas,
// modificar un formato siempre implica tocar código). pdfkit puro — sin
// Chromium ni otro proceso, para no complicar el despliegue en el droplet.

export interface PdfTableColumn {
  key: string;
  header: string;
  width: number;
  align?: 'left' | 'right' | 'center';
}

// Arma el documento completo en memoria y lo resuelve como Buffer — mismo
// patrón que ya usa ProjectsController.exportSummary con el .xlsx
// (workbook.xlsx.writeBuffer() → res.send(buffer)), no streaming directo a
// la respuesta.
export function renderPdfToBuffer(build: (doc: PDFKit.PDFDocument) => void): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: 'letter' });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    try {
      build(doc);
      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

export function drawDocumentHeader(
  doc: PDFKit.PDFDocument,
  params: { institutionName: string; documentTitle: string; documentNumber?: string; generatedAt?: Date },
) {
  doc.fontSize(16).font('Helvetica-Bold').text(params.institutionName, { align: 'center' });
  doc.moveDown(0.3);
  doc.fontSize(13).font('Helvetica-Bold').text(params.documentTitle, { align: 'center' });
  if (params.documentNumber) {
    doc.moveDown(0.2);
    doc.fontSize(10).font('Helvetica').text(`No. ${params.documentNumber}`, { align: 'center' });
  }
  if (params.generatedAt) {
    doc.fontSize(9).font('Helvetica').fillColor('#666666')
      .text(`Generado el ${params.generatedAt.toLocaleDateString('es')}`, { align: 'center' });
    doc.fillColor('#000000');
  }
  doc.moveDown(1);
}

// Lista simple "etiqueta: valor" — para los datos del destinatario antes de
// la tabla (ej. nombre del donante, periodo).
export function drawKeyValueBlock(doc: PDFKit.PDFDocument, entries: [string, string][]) {
  for (const [label, value] of entries) {
    doc.fontSize(10).font('Helvetica-Bold').text(`${label}: `, { continued: true }).font('Helvetica').text(value);
  }
  doc.moveDown(1);
}

// Tabla genérica de líneas con encabezado — columnas con ancho fijo, sin
// paginación automática de tabla (documentos cortos, no se necesita todavía).
export function drawTable(
  doc: PDFKit.PDFDocument,
  columns: PdfTableColumn[],
  rows: Record<string, string>[],
) {
  const startX = doc.x;
  let y = doc.y;
  const rowHeight = 20;

  doc.fontSize(9).font('Helvetica-Bold');
  let x = startX;
  for (const col of columns) {
    doc.text(col.header, x, y, { width: col.width, align: col.align ?? 'left' });
    x += col.width;
  }
  y += rowHeight;
  doc.moveTo(startX, y - 4).lineTo(x, y - 4).strokeColor('#cccccc').stroke();

  doc.font('Helvetica').fontSize(9);
  for (const row of rows) {
    if (y > doc.page.height - doc.page.margins.bottom - rowHeight) {
      doc.addPage();
      y = doc.y;
    }
    x = startX;
    for (const col of columns) {
      doc.text(row[col.key] ?? '', x, y, { width: col.width, align: col.align ?? 'left' });
      x += col.width;
    }
    y += rowHeight;
  }

  doc.moveTo(startX, y).lineTo(x, y).strokeColor('#cccccc').stroke();
  doc.y = y + 10;
}

export function drawFooterNote(doc: PDFKit.PDFDocument, text: string) {
  doc.moveDown(1);
  doc.fontSize(8).font('Helvetica-Oblique').fillColor('#666666').text(text, { align: 'left' });
  doc.fillColor('#000000');
}
