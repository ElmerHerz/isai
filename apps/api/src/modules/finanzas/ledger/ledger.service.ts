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
  // Recibe la tx ya abierta por el caller (el trigger DEFERRABLE de balance
  // en finanzas.journal_entry_lines exige que el asiento completo — entry +
  // lines + el reclamo atómico del registro de origen, cuando aplica — viva
  // en la MISMA transacción, ver finanzas.prisma). LedgerService no abre su
  // propia transacción a propósito: no sabe (ni debe saber) si el caller
  // también necesita reclamar una fila de origen dentro de la misma tx.
  async postEntry(tx: Prisma.TransactionClient, input: PostEntryInput): Promise<JournalEntry> {
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
}
