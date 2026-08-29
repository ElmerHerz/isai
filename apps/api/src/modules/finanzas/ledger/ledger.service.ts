import { Injectable, BadRequestException } from '@nestjs/common';
import { Prisma, JournalEntry } from '@prisma/client';

export interface LedgerLineInput {
  accountId: string;
  debitAmount?: Prisma.Decimal.Value;
  creditAmount?: Prisma.Decimal.Value;
  groupId?: string | null;
  projectId?: string | null;
  description?: string;
}

export interface PostEntryInput {
  tenantId: string;
  institutionId: string;
  branchId?: string | null;
  entryDate: Date;
  description?: string;
  sourceType: string;
  sourceId?: string | null;
  createdBy: string;
  lines: LedgerLineInput[];
}

// Único lugar que arma un JournalEntry + sus JournalEntryLine balanceadas —
// antes duplicado 3 veces (EventsService, ProjectsService, GroupFundsService,
// ver docs/finanzas-mejoras-propuestas.md §3).
@Injectable()
export class LedgerService {
  // Único punto de bloqueo de periodo cerrado (docs/finanzas-mejoras-propuestas.md
  // §9.1) — postEntry es el único lugar que arma un JournalEntry (ver
  // comentario de arriba), así que chequear acá cubre Proyectos/Fondos de
  // Grupo/Eventos/el propio cierre sin tocar esos servicios. Un cierre con
  // branchId null bloquea toda la institución; uno puntual solo esa
  // sucursal — mismo criterio "null = toda la institución" que Budget.
  private async assertPeriodOpen(
    tx: Prisma.TransactionClient,
    institutionId: string,
    branchId: string | null | undefined,
    entryDate: Date,
  ) {
    const closing = await tx.periodClosing.findFirst({
      where: {
        institutionId,
        reopenedAt: null,
        OR: [{ branchId: null }, { branchId: branchId ?? null }],
      },
      orderBy: { closedThroughDate: 'desc' },
    });
    if (closing && entryDate <= closing.closedThroughDate) {
      throw new BadRequestException(
        `El periodo está cerrado hasta ${closing.closedThroughDate.toISOString().slice(0, 10)}. Pide que se reabra si necesitas corregir algo de esa fecha.`,
      );
    }
  }

  // Recibe la tx ya abierta por el caller (el trigger DEFERRABLE de balance
  // en finanzas.journal_entry_lines exige que el asiento completo — entry +
  // lines + el reclamo atómico del registro de origen, cuando aplica — viva
  // en la MISMA transacción, ver finanzas.prisma). LedgerService no abre su
  // propia transacción a propósito: no sabe (ni debe saber) si el caller
  // también necesita reclamar una fila de origen dentro de la misma tx.
  async postEntry(tx: Prisma.TransactionClient, input: PostEntryInput): Promise<JournalEntry> {
    await this.assertPeriodOpen(tx, input.institutionId, input.branchId, input.entryDate);

    const totalDebit = input.lines.reduce((s, l) => s.plus(l.debitAmount ?? 0), new Prisma.Decimal(0));
    const totalCredit = input.lines.reduce((s, l) => s.plus(l.creditAmount ?? 0), new Prisma.Decimal(0));
    if (!totalDebit.equals(totalCredit)) {
      // Falla rápido con mensaje claro, antes de tocar la base — el trigger
      // de Postgres igual lo rechazaría al hacer COMMIT, pero con un error
      // genérico de constraint en vez de esto.
      throw new BadRequestException('El asiento no está balanceado: la suma de débitos debe igualar la de créditos.');
    }

    const journalEntry = await tx.journalEntry.create({
      data: {
        tenantId: input.tenantId,
        institutionId: input.institutionId,
        branchId: input.branchId ?? null,
        entryDate: input.entryDate,
        description: input.description,
        sourceType: input.sourceType,
        sourceId: input.sourceId ?? null,
        createdBy: input.createdBy,
      },
    });

    await tx.journalEntryLine.createMany({
      data: input.lines.map((line) => ({
        journalEntryId: journalEntry.id,
        accountId: line.accountId,
        groupId: line.groupId ?? null,
        projectId: line.projectId ?? null,
        debitAmount: line.debitAmount ?? 0,
        creditAmount: line.creditAmount ?? 0,
        description: line.description,
      })),
    });

    return journalEntry;
  }

  // Anular = generar el asiento de reversa (débito/crédito invertidos,
  // fechado hoy) y enlazar ambos — nunca se borra ni se "esconde" el
  // original, se corrige con uno nuevo (estándar contable real). El trigger
  // DEFERRABLE de balance solo verifica al COMMIT de toda la tx, así que
  // crear la reversa y actualizar ambos asientos en la misma tx es seguro.
  async voidEntry(tx: Prisma.TransactionClient, entryId: string, reason: string, voidedBy: string) {
    const original = await tx.journalEntry.findUniqueOrThrow({
      where: { id: entryId },
      include: { lines: true },
    });
    if (original.status !== 'posted') {
      throw new BadRequestException('Solo se puede anular un asiento contabilizado.');
    }
    if (original.reversesEntryId) {
      throw new BadRequestException('No se puede anular un asiento que ya es una reversa.');
    }
    // La reversa que se genera abajo se fecha hoy (entryDate: new Date()),
    // así que el chequeo dentro de postEntry nunca la bloquearía — pero
    // anular un asiento ORIGINAL fechado en un periodo ya cerrado sí debe
    // rechazarse, se chequea acá explícitamente contra la fecha original.
    await this.assertPeriodOpen(tx, original.institutionId, original.branchId, original.entryDate);

    const reversal = await this.postEntry(tx, {
      tenantId: original.tenantId,
      institutionId: original.institutionId,
      branchId: original.branchId,
      entryDate: new Date(),
      description: `Reversa de anulación: ${original.description ?? ''}`.trim(),
      // NO reutiliza sourceType/sourceId del original — un índice único
      // parcial en la base real (uq_journal_entries_source, hallazgo real
      // al probar en vivo) exige que (source_type, source_id) sea único
      // entre TODOS los asientos, sin importar su status. El origen real de
      // la reversa es "se anuló el asiento X", no el mismo registro de
      // origen — y original.id es único por construcción (no se puede
      // anular dos veces el mismo asiento, ver chequeo de status arriba).
      sourceType: 'journal_entry_void',
      sourceId: original.id,
      createdBy: voidedBy,
      lines: original.lines.map((line) => ({
        accountId: line.accountId,
        groupId: line.groupId,
        projectId: line.projectId,
        debitAmount: line.creditAmount,
        creditAmount: line.debitAmount,
        description: line.description ?? undefined,
      })),
    });

    await tx.journalEntry.update({ where: { id: reversal.id }, data: { reversesEntryId: entryId } });

    return tx.journalEntry.update({
      where: { id: entryId },
      data: {
        status: 'void',
        voidedAt: new Date(),
        voidedBy,
        voidReason: reason,
        reversedByEntryId: reversal.id,
      },
      include: {
        branch: { select: { id: true, name: true } },
        lines: { include: { account: { select: { id: true, code: true, name: true } } } },
      },
    });
  }
}
