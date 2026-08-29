import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { LedgerService } from '../ledger/ledger.service';
import { resolveAllBranchesScope, type AllBranchesScope } from '../../../common/utils/institution-scope.util';
import type { RequestUser } from '../../../common/decorators/current-user.decorator';

const linesInclude = {
  lines: {
    include: { account: { select: { id: true, code: true, name: true } } },
    orderBy: { createdAt: 'asc' as const },
  },
};

// Recorte 1: los asientos se crean vía EventsService.postFundCollectionToLedger/
// ProjectsService/GroupFundsService ("Contabilizar") — el formulario de
// asiento manual queda para una fase futura. Anular (voidEntry) sí vive acá,
// es la única escritura de este servicio hoy.
@Injectable()
export class JournalEntriesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ledger: LedgerService,
  ) {}

  // Un usuario restringido a una o varias sucursales puntuales solo debe ver
  // asientos de esas sucursales (o de toda una institución si su rol es
  // institucional) — hallazgo de sesión: este servicio no filtraba alcance
  // en absoluto, a diferencia de ProjectsService/GroupFundsService/EventsService.
  private scopeWhere(scope: AllBranchesScope): Prisma.JournalEntryWhereInput {
    if (scope.unrestricted) return {};
    const or: Prisma.JournalEntryWhereInput[] = [];
    if (scope.wholeInstitutionIds.length > 0) or.push({ institutionId: { in: scope.wholeInstitutionIds } });
    if (scope.branchIds.length > 0) or.push({ branchId: { in: scope.branchIds } });
    return { OR: or.length > 0 ? or : [{ id: '__none__' }] };
  }

  async findAll(tenantId: string | null, user: RequestUser) {
    if (!tenantId) return [];

    const scope = await resolveAllBranchesScope(this.prisma, user);

    return this.prisma.journalEntry.findMany({
      where: { tenantId, ...this.scopeWhere(scope) },
      include: { branch: { select: { id: true, name: true } }, ...linesInclude },
      orderBy: { entryDate: 'desc' },
    });
  }

  async findOne(id: string, tenantId: string | null, user: RequestUser) {
    const scope = await resolveAllBranchesScope(this.prisma, user);

    const entry = await this.prisma.journalEntry.findFirst({
      where: { id, ...(tenantId ? { tenantId } : {}), ...this.scopeWhere(scope) },
      include: { branch: { select: { id: true, name: true } }, ...linesInclude },
    });
    // Nunca Forbidden acá — un asiento fuera de alcance se trata igual que
    // uno inexistente, mismo criterio que ProjectsService/GroupsService.
    if (!entry) throw new NotFoundException(`Asiento "${id}" no encontrado`);
    return entry;
  }

  async voidEntry(id: string, reason: string, tenantId: string | null, user: RequestUser) {
    const scope = await resolveAllBranchesScope(this.prisma, user);

    const entry = await this.prisma.journalEntry.findFirst({
      where: { id, ...(tenantId ? { tenantId } : {}), ...this.scopeWhere(scope) },
    });
    if (!entry) throw new NotFoundException(`Asiento "${id}" no encontrado`);

    return this.prisma.$transaction(async (tx) => {
      const voided = await this.ledger.voidEntry(tx, id, reason, user.userId);

      // Desenlaza el registro de origen para que vuelva a estar "pendiente de
      // contabilizar" — mismos 3 modelos que ya bloquean su propio borrado
      // cuando journalEntryId tiene valor (EventFundCollection/
      // ProjectContribution/ProjectExpense). group_fund_movement no tiene
      // fila de origen separada, no aplica.
      if (entry.sourceType === 'event_fund_collection' && entry.sourceId) {
        await tx.eventFundCollection.updateMany({
          where: { id: entry.sourceId, journalEntryId: id },
          data: { journalEntryId: null },
        });
      } else if (entry.sourceType === 'project_contribution' && entry.sourceId) {
        await tx.projectContribution.updateMany({
          where: { id: entry.sourceId, journalEntryId: id },
          data: { journalEntryId: null },
        });
      } else if (entry.sourceType === 'project_expense' && entry.sourceId) {
        await tx.projectExpense.updateMany({
          where: { id: entry.sourceId, journalEntryId: id },
          data: { journalEntryId: null },
        });
      }

      return voided;
    });
  }
}
