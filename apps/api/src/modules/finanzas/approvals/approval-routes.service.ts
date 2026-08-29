import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { CreateApprovalRouteDto } from './dto/create-approval-route.dto';
import { UpdateApprovalRouteDto } from './dto/update-approval-route.dto';
import type { RequestUser } from '../../../common/decorators/current-user.decorator';

const include = {
  institution: { select: { id: true, name: true } },
  branch: { select: { id: true, name: true } },
  steps: {
    orderBy: { stepOrder: 'asc' as const },
    include: { approverUser: { select: { id: true, firstName: true, lastName: true, email: true } } },
  },
  accounts: {
    include: { account: { select: { id: true, code: true, name: true } } },
  },
};

// Config de rutas de aprobación de gastos (§7.3, rediseñado como ruta
// multi-paso) — administrativo, sin scope por institución/sucursal del
// usuario a propósito, mismo criterio que tenía ApprovalThresholdsService.
// Gobierna gastos de Proyecto Y de Fondo de Grupo (ver ExpenseApprovalsService)
// — vivía en el módulo proyectos, se movió a finanzas para que ambos
// consumidores puedan importarlo sin ciclo de módulos.
@Injectable()
export class ApprovalRoutesService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(tenantId: string | null) {
    if (!tenantId) return [];

    return this.prisma.approvalRoute.findMany({
      where: { tenantId },
      include,
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(tenantId: string | null, dto: CreateApprovalRouteDto, user: RequestUser) {
    if (!tenantId) {
      throw new BadRequestException('Como superadmin, indica ?tenantId=<uuid> para especificar a qué tenant pertenece.');
    }

    if (dto.institutionId) {
      const institution = await this.prisma.institution.findFirst({ where: { id: dto.institutionId, tenantId } });
      if (!institution) throw new BadRequestException('Esa institución no pertenece a este tenant.');
    }
    if (dto.branchId) {
      if (!dto.institutionId) {
        throw new BadRequestException('Indica la institución si vas a limitar por sucursal.');
      }
      const branch = await this.prisma.branch.findFirst({ where: { id: dto.branchId, institutionId: dto.institutionId } });
      if (!branch) throw new BadRequestException('Esa sucursal no pertenece a la institución indicada.');
    }

    const users = await this.prisma.user.findMany({ where: { id: { in: dto.approverUserIds }, tenantId } });
    if (users.length !== dto.approverUserIds.length) {
      throw new BadRequestException('Alguna de las personas elegidas no pertenece a este tenant.');
    }

    const accounts = await this.prisma.account.findMany({ where: { id: { in: dto.accountIds }, tenantId } });
    if (accounts.length !== dto.accountIds.length) {
      throw new BadRequestException('Alguna de las cuentas elegidas no pertenece a este tenant.');
    }

    return this.prisma.approvalRoute.create({
      data: {
        tenantId,
        institutionId: dto.institutionId,
        branchId: dto.branchId,
        name: dto.name,
        minAmount: dto.minAmount,
        createdBy: user.userId,
        steps: {
          create: dto.approverUserIds.map((approverUserId, index) => ({
            stepOrder: index + 1,
            approverUserId,
          })),
        },
        accounts: { create: dto.accountIds.map((accountId) => ({ accountId })) },
      },
      include,
    });
  }

  async update(id: string, tenantId: string | null, dto: UpdateApprovalRouteDto) {
    const route = await this.prisma.approvalRoute.findFirst({ where: { id, ...(tenantId ? { tenantId } : {}) } });
    if (!route) throw new NotFoundException(`Ruta "${id}" no encontrada`);

    return this.prisma.approvalRoute.update({
      where: { id },
      data: { minAmount: dto.minAmount, isActive: dto.isActive },
      include,
    });
  }
}
