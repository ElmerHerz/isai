import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { CreateBudgetDto } from './dto/create-budget.dto';
import { UpdateBudgetDto } from './dto/update-budget.dto';
import { CreateBudgetLineDto } from './dto/create-budget-line.dto';
import { resolveInstitutionScope, resolveBranchScope } from '../../../common/utils/institution-scope.util';
import type { RequestUser } from '../../../common/decorators/current-user.decorator';

const include = {
  branch: { select: { id: true, name: true } },
  lines: {
    include: { account: { select: { id: true, code: true, name: true } } },
  },
};

// Presupuestos (Budget vs. Actual) — docs/finanzas-mejoras-propuestas.md §7.1.
// Mismo criterio de alcance que ProjectsService (institución obligatoria,
// sucursal opcional — null = toda la institución), para nacer ya scopeado.
@Injectable()
export class BudgetsService {
  constructor(private readonly prisma: PrismaService) {}

  private async assertInstitutionAccessible(institutionId: string, tenantId: string | null, user: RequestUser) {
    const institution = await this.prisma.institution.findFirst({
      where: { id: institutionId, ...(tenantId ? { tenantId } : {}) },
    });
    if (!institution) {
      throw new BadRequestException(`Institución "${institutionId}" no encontrada`);
    }

    if (!user.isSuperadmin) {
      const scope = await resolveInstitutionScope(this.prisma, user);
      if (!scope.unrestricted && !scope.institutionIds.includes(institutionId)) {
        throw new ForbiddenException('No tienes alcance sobre esa institución.');
      }
    }

    return institution;
  }

  private async assertBranchBelongsToInstitution(branchId: string, institutionId: string) {
    const branch = await this.prisma.branch.findFirst({ where: { id: branchId, institutionId } });
    if (!branch) {
      throw new BadRequestException('La sucursal no pertenece a la institución indicada.');
    }
  }

  // Nunca confiar en que el <Select> del frontend ya filtró por tenant —
  // mismo criterio que ProjectsService.assertAccountBelongsToTenant.
  private async assertAccountBelongsToTenant(accountId: string, tenantId: string) {
    const account = await this.prisma.account.findFirst({ where: { id: accountId, tenantId } });
    if (!account) {
      throw new BadRequestException('Esa cuenta no pertenece a este tenant.');
    }
  }

  private async findBudgetOrThrow(id: string, tenantId: string | null) {
    const budget = await this.prisma.budget.findFirst({
      where: { id, ...(tenantId ? { tenantId } : {}) },
      include,
    });
    if (!budget) throw new NotFoundException(`Presupuesto "${id}" no encontrado`);
    return budget;
  }

  // branchId null (presupuesto de toda la institución) solo es visible para
  // quien tiene alcance de institución completa — mismo criterio que ya se
  // aplicó al corregir el alcance de JournalEntry: un usuario limitado a una
  // sucursal puntual no ve lo que es "de toda la institución".
  private async assertBudgetAccessible(
    budget: { institutionId: string; branchId: string | null },
    user: RequestUser,
  ) {
    if (user.isSuperadmin) return;

    const institutionScope = await resolveInstitutionScope(this.prisma, user);
    if (!institutionScope.unrestricted && !institutionScope.institutionIds.includes(budget.institutionId)) {
      throw new NotFoundException('Presupuesto no encontrado');
    }

    const branchScope = await resolveBranchScope(this.prisma, { ...user, institutionId: budget.institutionId });
    if (!branchScope.unrestricted && (!budget.branchId || !branchScope.branchIds.includes(budget.branchId))) {
      throw new NotFoundException('Presupuesto no encontrado');
    }
  }

  private async getAccessibleBudget(id: string, tenantId: string | null, user: RequestUser) {
    const budget = await this.findBudgetOrThrow(id, tenantId);
    await this.assertBudgetAccessible(budget, user);
    return budget;
  }

  async findAll(institutionId: string, tenantId: string | null, user: RequestUser) {
    await this.assertInstitutionAccessible(institutionId, tenantId, user);

    const branchScope = await resolveBranchScope(this.prisma, { ...user, institutionId });

    return this.prisma.budget.findMany({
      where: {
        institutionId,
        ...(branchScope.unrestricted ? {} : { branchId: { in: branchScope.branchIds } }),
      },
      include,
      orderBy: { periodStart: 'desc' },
    });
  }

  findOne(id: string, tenantId: string | null, user: RequestUser) {
    return this.getAccessibleBudget(id, tenantId, user);
  }

  async create(tenantId: string | null, dto: CreateBudgetDto, user: RequestUser) {
    const institution = await this.assertInstitutionAccessible(dto.institutionId, tenantId, user);
    if (dto.branchId) {
      await this.assertBranchBelongsToInstitution(dto.branchId, dto.institutionId);
    }

    if (!user.isSuperadmin) {
      const branchScope = await resolveBranchScope(this.prisma, { ...user, institutionId: dto.institutionId });
      if (!branchScope.unrestricted && (!dto.branchId || !branchScope.branchIds.includes(dto.branchId))) {
        throw new ForbiddenException('No tienes alcance para crear un presupuesto fuera de tu sucursal.');
      }
    }

    return this.prisma.budget.create({
      data: {
        tenantId: institution.tenantId,
        institutionId: dto.institutionId,
        branchId: dto.branchId,
        name: dto.name,
        periodStart: new Date(dto.periodStart),
        periodEnd: new Date(dto.periodEnd),
        notes: dto.notes,
        createdBy: user.userId,
      },
      include,
    });
  }

  async update(id: string, tenantId: string | null, dto: UpdateBudgetDto, user: RequestUser) {
    await this.getAccessibleBudget(id, tenantId, user);

    return this.prisma.budget.update({
      where: { id },
      data: {
        name: dto.name,
        periodStart: dto.periodStart ? new Date(dto.periodStart) : undefined,
        periodEnd: dto.periodEnd ? new Date(dto.periodEnd) : undefined,
        notes: dto.notes,
        status: dto.status,
      },
      include,
    });
  }

  async addLine(budgetId: string, tenantId: string | null, dto: CreateBudgetLineDto, user: RequestUser) {
    const budget = await this.getAccessibleBudget(budgetId, tenantId, user);
    await this.assertAccountBelongsToTenant(dto.accountId, budget.tenantId);

    await this.prisma.budgetLine.create({
      data: {
        budgetId,
        accountId: dto.accountId,
        monthlyAmount: dto.monthlyAmount,
        notes: dto.notes,
      },
    });

    return this.findBudgetOrThrow(budgetId, tenantId);
  }

  async removeLine(budgetId: string, lineId: string, tenantId: string | null, user: RequestUser) {
    await this.getAccessibleBudget(budgetId, tenantId, user);

    const line = await this.prisma.budgetLine.findFirst({ where: { id: lineId, budgetId } });
    if (!line) throw new NotFoundException(`Línea "${lineId}" no encontrada`);

    await this.prisma.budgetLine.delete({ where: { id: lineId } });
  }
}
