import { Injectable, BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../common/prisma/prisma.service';

// Generador de correlativos reusable por tipo de documento — el prefijo ya
// no se recibe como texto libre desde el caller (fuente real de bugs: dos
// módulos podían usar prefijos distintos para "lo mismo" por error de
// tipeo), se resuelve desde el catálogo general.document_types (ver plan de
// sesión). Sin controller — es infraestructura interna, no algo que un
// usuario configure directo (el catálogo se siembra por SQL).
@Injectable()
export class DocumentSequencesService {
  constructor(private readonly prisma: PrismaService) {}

  // Atómico vía INSERT ... ON CONFLICT ... DO UPDATE ... RETURNING — dos
  // gastos registrados a la vez en la misma sucursal nunca reciben el
  // mismo número, sin necesitar un SELECT ... FOR UPDATE aparte. Recibe la
  // tx ya abierta por el caller (mismo criterio que LedgerService.postEntry):
  // el correlativo debe nacer en la MISMA transacción que crea el
  // documento, o un rollback dejaría un número "quemado" sin documento.
  async getNextDocumentNumber(
    tx: Prisma.TransactionClient,
    params: { tenantId: string; branchId: string | null; documentTypeCode: string },
  ): Promise<string> {
    const documentType = await this.prisma.documentType.findUnique({ where: { code: params.documentTypeCode } });
    if (!documentType || !documentType.isActive) {
      throw new BadRequestException(`Tipo de documento "${params.documentTypeCode}" no existe o está inactivo.`);
    }

    const year = new Date().getFullYear();
    const [row] = await tx.$queryRaw<{ last_number: number }[]>`
      INSERT INTO general.document_sequences (tenant_id, branch_id, document_type, year, last_number)
      VALUES (${params.tenantId}::uuid, ${params.branchId}::uuid, ${params.documentTypeCode}, ${year}, 1)
      ON CONFLICT (tenant_id, branch_id, document_type, year)
      DO UPDATE SET last_number = general.document_sequences.last_number + 1
      RETURNING last_number
    `;
    return `${documentType.prefix}-${year}-${String(row!.last_number).padStart(6, '0')}`;
  }
}
