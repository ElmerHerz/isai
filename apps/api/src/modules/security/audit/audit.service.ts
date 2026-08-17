import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';

export interface AuditLogQuery {
  page: number;
  pageSize: number;
  entityType?: string;
  action?: string;
  search?: string;
}

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(tenantId: string | null, query: AuditLogQuery) {
    const where = {
      ...(tenantId ? { tenantId } : {}),
      ...(query.entityType ? { entityType: query.entityType } : {}),
      ...(query.action ? { action: query.action } : {}),
      // Búsqueda por usuario (nombre/correo) — nunca por entityId: es una
      // columna uuid, un texto libre que no calza el formato tronaría la
      // query en vez de simplemente no encontrar nada.
      ...(query.search
        ? {
            user: {
              OR: [
                { email: { contains: query.search, mode: 'insensitive' as const } },
                { firstName: { contains: query.search, mode: 'insensitive' as const } },
                { lastName: { contains: query.search, mode: 'insensitive' as const } },
              ],
            },
          }
        : {}),
    };

    const [rows, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        include: { user: { select: { id: true, firstName: true, lastName: true, email: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    // id es BigInt (autoincrement) — JSON.stringify no sabe serializarlo,
    // se manda como string.
    const data = rows.map((row) => ({ ...row, id: row.id.toString() }));

    return { data, total };
  }

  async entityTypes(tenantId: string | null) {
    const rows = await this.prisma.auditLog.findMany({
      where: { ...(tenantId ? { tenantId } : {}), entityType: { not: null } },
      select: { entityType: true },
      distinct: ['entityType'],
      orderBy: { entityType: 'asc' },
    });
    return rows.map((r) => r.entityType).filter((v): v is string => !!v);
  }
}
