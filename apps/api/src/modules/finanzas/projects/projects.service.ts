import { Injectable, NotFoundException, BadRequestException, ForbiddenException, ConflictException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { CreateProjectContributionDto } from './dto/create-project-contribution.dto';
import { CreateProjectExpenseDto } from './dto/create-project-expense.dto';
import { resolveInstitutionScope, resolveBranchScope } from '../../../common/utils/institution-scope.util';
import type { RequestUser } from '../../../common/decorators/current-user.decorator';

const include = {
  branch: { select: { id: true, name: true } },
  incomeAccount: { select: { id: true, code: true, name: true } },
};

const contributionsInclude = {
  person: { select: { id: true, firstName: true, lastName: true } },
  group: { select: { id: true, name: true } },
};

const expensesInclude = {
  account: { select: { id: true, code: true, name: true } },
};

// Campañas de recaudación (meta + fecha) — ver plan de sesión. Mismo
// criterio de scope que EventsService (institución + sucursal), y mismo
// patrón "Contabilizar" que EventsService::postFundCollectionToLedger.
@Injectable()
export class ProjectsService {
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

  // Nunca confiar en que el <Select> del frontend ya filtró por tenant
  // (aunque GET /accounts ya esté scopeado por RLS) — mismo criterio que se
  // aplica en todo lo demás vía RLS/JWT, ver plan de sesión.
  private async assertAccountBelongsToTenant(accountId: string, tenantId: string) {
    const account = await this.prisma.account.findFirst({ where: { id: accountId, tenantId } });
    if (!account) {
      throw new BadRequestException('Esa cuenta no pertenece a este tenant.');
    }
  }

  private async findProjectOrThrow(id: string, tenantId: string | null) {
    const project = await this.prisma.project.findFirst({
      where: { id, ...(tenantId ? { tenantId } : {}) },
      include,
    });
    if (!project) throw new NotFoundException(`Proyecto "${id}" no encontrado`);
    return project;
  }

  private async assertProjectAccessible(
    project: { institutionId: string; branchId: string },
    user: RequestUser,
  ) {
    if (user.isSuperadmin) return;

    const institutionScope = await resolveInstitutionScope(this.prisma, user);
    if (!institutionScope.unrestricted && !institutionScope.institutionIds.includes(project.institutionId)) {
      throw new NotFoundException('Proyecto no encontrado');
    }

    const branchScope = await resolveBranchScope(this.prisma, { ...user, institutionId: project.institutionId });
    if (!branchScope.unrestricted && !branchScope.branchIds.includes(project.branchId)) {
      throw new NotFoundException('Proyecto no encontrado');
    }
  }

  private async getAccessibleProject(id: string, tenantId: string | null, user: RequestUser) {
    const project = await this.findProjectOrThrow(id, tenantId);
    await this.assertProjectAccessible(project, user);
    return project;
  }

  // Total aportado y gastado (SIN filtrar por journalEntryId — cuentan
  // también lo pendiente de contabilizar, ver header del schema y plan de
  // sesión) para cada proyecto, en dos groupBy en vez de N queries.
  private async withTotals<T extends { id: string }>(projects: T[]) {
    if (projects.length === 0) {
      return [] as (T & { totalContributed: string; totalSpent: string })[];
    }

    const [contributionTotals, expenseTotals] = await Promise.all([
      this.prisma.projectContribution.groupBy({
        by: ['projectId'],
        where: { projectId: { in: projects.map((p) => p.id) } },
        _sum: { amount: true },
      }),
      this.prisma.projectExpense.groupBy({
        by: ['projectId'],
        where: { projectId: { in: projects.map((p) => p.id) } },
        _sum: { amount: true },
      }),
    ]);
    const contributedByProject = new Map(contributionTotals.map((t) => [t.projectId, t._sum.amount]));
    const spentByProject = new Map(expenseTotals.map((t) => [t.projectId, t._sum.amount]));

    return projects.map((p) => ({
      ...p,
      totalContributed: (contributedByProject.get(p.id) ?? 0).toString(),
      totalSpent: (spentByProject.get(p.id) ?? 0).toString(),
    }));
  }

  async findAll(institutionId: string, tenantId: string | null, user: RequestUser) {
    await this.assertInstitutionAccessible(institutionId, tenantId, user);

    const branchScope = await resolveBranchScope(this.prisma, { ...user, institutionId });

    const projects = await this.prisma.project.findMany({
      where: {
        institutionId,
        ...(branchScope.unrestricted ? {} : { branchId: { in: branchScope.branchIds } }),
      },
      include,
      orderBy: { createdAt: 'desc' },
    });

    return this.withTotals(projects);
  }

  async findOne(id: string, tenantId: string | null, user: RequestUser) {
    const project = await this.getAccessibleProject(id, tenantId, user);
    const [withTotal] = await this.withTotals([project]);
    return withTotal;
  }

  async create(tenantId: string | null, dto: CreateProjectDto, user: RequestUser) {
    const institution = await this.assertInstitutionAccessible(dto.institutionId, tenantId, user);
    await this.assertBranchBelongsToInstitution(dto.branchId, dto.institutionId);
    if (dto.incomeAccountId) {
      await this.assertAccountBelongsToTenant(dto.incomeAccountId, institution.tenantId);
    }

    const project = await this.prisma.project.create({
      data: {
        tenantId: institution.tenantId,
        institutionId: dto.institutionId,
        branchId: dto.branchId,
        name: dto.name,
        description: dto.description,
        goalAmount: dto.goalAmount,
        targetDate: dto.targetDate ? new Date(dto.targetDate) : undefined,
        incomeAccountId: dto.incomeAccountId,
        createdBy: user.userId,
      },
      include,
    });
    const [withTotal] = await this.withTotals([project]);
    return withTotal;
  }

  async update(id: string, tenantId: string | null, dto: UpdateProjectDto, user: RequestUser) {
    const project = await this.getAccessibleProject(id, tenantId, user);
    if (dto.incomeAccountId) {
      await this.assertAccountBelongsToTenant(dto.incomeAccountId, project.tenantId);
    }

    const updated = await this.prisma.project.update({
      where: { id },
      data: {
        name: dto.name,
        description: dto.description,
        goalAmount: dto.goalAmount,
        targetDate: dto.targetDate ? new Date(dto.targetDate) : undefined,
        incomeAccountId: dto.incomeAccountId,
        status: dto.status,
      },
      include,
    });
    const [withTotal] = await this.withTotals([updated]);
    return withTotal;
  }

  // --- Aportes ---------------------------------------------------------------

  async findContributions(projectId: string, tenantId: string | null, user: RequestUser) {
    await this.getAccessibleProject(projectId, tenantId, user);

    return this.prisma.projectContribution.findMany({
      where: { projectId },
      include: contributionsInclude,
      orderBy: { contributedAt: 'desc' },
    });
  }

  async createContribution(
    projectId: string,
    tenantId: string | null,
    dto: CreateProjectContributionDto,
    user: RequestUser,
  ) {
    const project = await this.getAccessibleProject(projectId, tenantId, user);

    if (!dto.personId && !dto.groupId) {
      throw new BadRequestException('Indica quién aporta: una persona o un grupo.');
    }
    if (dto.personId && dto.groupId) {
      throw new BadRequestException('El aporte es de una persona o de un grupo, no de ambos.');
    }

    if (dto.personId) {
      const person = await this.prisma.person.findFirst({
        where: { id: dto.personId, institutionId: project.institutionId, deletedAt: null },
      });
      if (!person) throw new BadRequestException('La persona no pertenece a la institución de este proyecto.');
    }
    if (dto.groupId) {
      const group = await this.prisma.group.findFirst({
        where: { id: dto.groupId, institutionId: project.institutionId },
      });
      if (!group) throw new BadRequestException('El grupo no pertenece a la institución de este proyecto.');
    }

    return this.prisma.projectContribution.create({
      data: {
        projectId,
        personId: dto.personId,
        groupId: dto.groupId,
        amount: dto.amount,
        contributedAt: new Date(dto.contributedAt),
        notes: dto.notes,
      },
      include: contributionsInclude,
    });
  }

  async removeContribution(
    projectId: string,
    contributionId: string,
    tenantId: string | null,
    user: RequestUser,
  ) {
    await this.getAccessibleProject(projectId, tenantId, user);

    const row = await this.prisma.projectContribution.findFirst({ where: { id: contributionId, projectId } });
    if (!row) throw new NotFoundException(`Aporte "${contributionId}" no encontrado`);
    if (row.journalEntryId) {
      throw new BadRequestException('Este aporte ya fue contabilizado — no se puede eliminar sin dejar un asiento huérfano.');
    }

    await this.prisma.projectContribution.delete({ where: { id: contributionId } });
  }

  // --- Contabilizar (finanzas) -------------------------------------------
  // Un solo lugar arma cualquier asiento de 2 líneas balanceado (dentro de
  // un $transaction, obligatorio por el trigger deferred de balance — ver
  // finanzas.prisma) — lo usan tanto postContributionToLedger como
  // postExpenseToLedger, para que la lógica contable nunca diverja entre
  // los dos flujos (ver plan de sesión: "lo más correcto, no lo más
  // fácil").
  private async createBalancedEntry(
    tx: Prisma.TransactionClient,
    params: {
      tenantId: string;
      institutionId: string;
      branchId: string;
      entryDate: Date;
      description: string;
      sourceType: string;
      sourceId: string;
      debitAccountId: string;
      debitDescription: string;
      creditAccountId: string;
      creditDescription: string;
      amount: Prisma.Decimal;
      groupId?: string | null;
      projectId?: string | null;
      createdBy: string;
    },
  ) {
    const journalEntry = await tx.journalEntry.create({
      data: {
        tenantId: params.tenantId,
        institutionId: params.institutionId,
        branchId: params.branchId,
        entryDate: params.entryDate,
        description: params.description,
        sourceType: params.sourceType,
        sourceId: params.sourceId,
        createdBy: params.createdBy,
      },
    });

    await tx.journalEntryLine.createMany({
      data: [
        {
          journalEntryId: journalEntry.id,
          accountId: params.debitAccountId,
          groupId: params.groupId,
          projectId: params.projectId,
          debitAmount: params.amount,
          creditAmount: 0,
          description: params.debitDescription,
        },
        {
          journalEntryId: journalEntry.id,
          accountId: params.creditAccountId,
          groupId: params.groupId,
          projectId: params.projectId,
          debitAmount: 0,
          creditAmount: params.amount,
          description: params.creditDescription,
        },
      ],
    });

    return journalEntry;
  }

  // Mismo patrón exacto que EventsService::postFundCollectionToLedger —
  // debe Caja de la sucursal del proyecto, haber la cuenta de ingreso del
  // proyecto.
  async postContributionToLedger(
    projectId: string,
    contributionId: string,
    tenantId: string | null,
    user: RequestUser,
  ) {
    const project = await this.getAccessibleProject(projectId, tenantId, user);

    const contribution = await this.prisma.projectContribution.findFirst({
      where: { id: contributionId, projectId },
    });
    if (!contribution) throw new NotFoundException(`Aporte "${contributionId}" no encontrado`);
    if (contribution.journalEntryId) {
      throw new BadRequestException('Este aporte ya fue contabilizado.');
    }
    if (!project.incomeAccountId) {
      throw new BadRequestException(
        `El proyecto "${project.name}" no tiene una cuenta de ingreso configurada. Configúrala antes de contabilizar.`,
      );
    }

    const branch = await this.prisma.branch.findUnique({ where: { id: project.branchId } });
    if (!branch?.defaultCashAccountId) {
      throw new BadRequestException(
        'La sucursal de este proyecto no tiene una cuenta de caja configurada. Configúrala antes de contabilizar.',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const journalEntry = await this.createBalancedEntry(tx, {
        tenantId: project.tenantId,
        institutionId: project.institutionId,
        branchId: project.branchId,
        entryDate: contribution.contributedAt,
        description: `Aporte a proyecto: ${project.name}`,
        sourceType: 'project_contribution',
        sourceId: contribution.id,
        debitAccountId: branch.defaultCashAccountId!,
        debitDescription: 'Caja',
        creditAccountId: project.incomeAccountId!,
        creditDescription: project.name,
        amount: contribution.amount,
        groupId: contribution.groupId,
        projectId: project.id,
        createdBy: user.userId,
      });

      // Reclamo atómico contra dos "Contabilizar" simultáneos sobre el mismo
      // aporte — ver el mismo fix en EventsService::postFundCollectionToLedger
      // (hallazgo de auditoría de sesión).
      const claim = await tx.projectContribution.updateMany({
        where: { id: contributionId, journalEntryId: null },
        data: { journalEntryId: journalEntry.id },
      });
      if (claim.count === 0) {
        throw new ConflictException('Este aporte ya fue contabilizado por otra solicitud.');
      }

      return tx.projectContribution.findUniqueOrThrow({
        where: { id: contributionId },
        include: contributionsInclude,
      });
    });
  }

  // --- Gastos ------------------------------------------------------------
  // Espejo estructural de Aportes — mismo patrón de dos pasos (registrar →
  // Contabilizar), ver plan de sesión.

  async findExpenses(projectId: string, tenantId: string | null, user: RequestUser) {
    await this.getAccessibleProject(projectId, tenantId, user);

    return this.prisma.projectExpense.findMany({
      where: { projectId },
      include: expensesInclude,
      orderBy: { incurredAt: 'desc' },
    });
  }

  async createExpense(
    projectId: string,
    tenantId: string | null,
    dto: CreateProjectExpenseDto,
    user: RequestUser,
  ) {
    const project = await this.getAccessibleProject(projectId, tenantId, user);

    const account = await this.prisma.account.findFirst({
      where: { id: dto.accountId, tenantId: project.tenantId },
      include: { accountType: { select: { code: true } } },
    });
    if (!account) {
      throw new BadRequestException('Esa cuenta no pertenece a este tenant.');
    }
    if (account.accountType.code !== 'EXPENSE') {
      throw new BadRequestException('La cuenta elegida debe ser de tipo Gasto.');
    }
    if (!account.allowsTransactions) {
      throw new BadRequestException('Esa cuenta es de agrupación — elige una cuenta que admita movimientos.');
    }

    return this.prisma.projectExpense.create({
      data: {
        projectId,
        accountId: dto.accountId,
        amount: dto.amount,
        incurredAt: new Date(dto.incurredAt),
        notes: dto.notes,
        createdBy: user.userId,
      },
      include: expensesInclude,
    });
  }

  async removeExpense(projectId: string, expenseId: string, tenantId: string | null, user: RequestUser) {
    await this.getAccessibleProject(projectId, tenantId, user);

    const row = await this.prisma.projectExpense.findFirst({ where: { id: expenseId, projectId } });
    if (!row) throw new NotFoundException(`Gasto "${expenseId}" no encontrado`);
    if (row.journalEntryId) {
      throw new BadRequestException('Este gasto ya fue contabilizado — no se puede eliminar sin dejar un asiento huérfano.');
    }

    await this.prisma.projectExpense.delete({ where: { id: expenseId } });
  }

  // Debe la cuenta de gasto elegida, haber Caja — el reverso exacto de
  // postContributionToLedger, mismo helper compartido.
  async postExpenseToLedger(projectId: string, expenseId: string, tenantId: string | null, user: RequestUser) {
    const project = await this.getAccessibleProject(projectId, tenantId, user);

    const expense = await this.prisma.projectExpense.findFirst({ where: { id: expenseId, projectId } });
    if (!expense) throw new NotFoundException(`Gasto "${expenseId}" no encontrado`);
    if (expense.journalEntryId) {
      throw new BadRequestException('Este gasto ya fue contabilizado.');
    }

    const branch = await this.prisma.branch.findUnique({ where: { id: project.branchId } });
    if (!branch?.defaultCashAccountId) {
      throw new BadRequestException(
        'La sucursal de este proyecto no tiene una cuenta de caja configurada. Configúrala antes de contabilizar.',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const journalEntry = await this.createBalancedEntry(tx, {
        tenantId: project.tenantId,
        institutionId: project.institutionId,
        branchId: project.branchId,
        entryDate: expense.incurredAt,
        description: `Gasto de proyecto: ${project.name}`,
        sourceType: 'project_expense',
        sourceId: expense.id,
        debitAccountId: expense.accountId,
        debitDescription: project.name,
        creditAccountId: branch.defaultCashAccountId!,
        creditDescription: 'Caja',
        amount: expense.amount,
        projectId: project.id,
        createdBy: user.userId,
      });

      // Mismo reclamo atómico que postContributionToLedger.
      const claim = await tx.projectExpense.updateMany({
        where: { id: expenseId, journalEntryId: null },
        data: { journalEntryId: journalEntry.id },
      });
      if (claim.count === 0) {
        throw new ConflictException('Este gasto ya fue contabilizado por otra solicitud.');
      }

      return tx.projectExpense.findUniqueOrThrow({
        where: { id: expenseId },
        include: expensesInclude,
      });
    });
  }
}
