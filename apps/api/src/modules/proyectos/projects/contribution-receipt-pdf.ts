import { renderPdfToBuffer, drawDocumentHeader, drawKeyValueBlock, drawFooterNote } from '../../../common/pdf/pdf-builder';
import type { Project, ProjectContribution } from '@prisma/client';

// person/group vienen con el select acotado de contributionsInclude
// (projects.service.ts), no el modelo Prisma completo.
type ContributionWithRelations = ProjectContribution & {
  person: { id: string; firstName: string; lastName: string } | null;
  group: { id: string; name: string } | null;
};

function contributorLabel(contribution: ContributionWithRelations) {
  if (contribution.person) return `${contribution.person.firstName} ${contribution.person.lastName}`;
  if (contribution.group) return `Grupo: ${contribution.group.name}`;
  return '—';
}

// Formato propio — deliberadamente distinto del comprobante de donante
// (§8.1, resumen anual) y de cualquier otro documento: este es un recibo de
// UNA transacción puntual (ver plan de sesión).
export function buildContributionReceiptPdf(
  project: Project,
  contribution: ContributionWithRelations,
  institutionName: string,
): Promise<Buffer> {
  if (!contribution.documentNumber) {
    throw new Error('buildContributionReceiptPdf requiere un comprobante ya generado (con folio).');
  }

  return renderPdfToBuffer((doc) => {
    drawDocumentHeader(doc, {
      institutionName,
      documentTitle: 'Comprobante de Aporte',
      documentNumber: contribution.documentNumber!,
      generatedAt: new Date(),
    });

    drawKeyValueBlock(doc, [
      ['Aportante', contributorLabel(contribution)],
      ['Proyecto', project.name],
      ['Fecha del aporte', contribution.contributedAt.toISOString().slice(0, 10)],
      ['Monto', `$${Number(contribution.amount).toFixed(2)}`],
      ...(contribution.notes ? ([['Notas', contribution.notes]] as [string, string][]) : []),
    ]);

    drawFooterNote(doc, 'Este comprobante certifica el aporte recibido para el proyecto indicado.');
  });
}
