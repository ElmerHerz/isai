import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';

const linesInclude = {
  lines: {
    include: { account: { select: { id: true, code: true, name: true } } },
    orderBy: { createdAt: 'asc' as const },
  },
};

// Recorte 1: solo lectura. Los asientos se crean únicamente vía
// EventsService.postFundCollectionToLedger ("Contabilizar") — el formulario
// de asiento manual queda para una fase 2.
@Injectable()
export class JournalEntriesService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(tenantId: string | null) {
    if (!tenantId) return [];

    return this.prisma.journalEntry.findMany({
      where: { tenantId },
      include: { branch: { select: { id: true, name: true } }, ...linesInclude },
      orderBy: { entryDate: 'desc' },
    });
  }

  async findOne(id: string, tenantId: string | null) {
    const entry = await this.prisma.journalEntry.findFirst({
      where: { id, ...(tenantId ? { tenantId } : {}) },
      include: { branch: { select: { id: true, name: true } }, ...linesInclude },
    });
    if (!entry) throw new NotFoundException(`Asiento "${id}" no encontrado`);
    return entry;
  }
}
