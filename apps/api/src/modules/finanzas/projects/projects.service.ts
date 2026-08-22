import { Injectable, NotFoundException, BadRequestException, ForbiddenException, ConflictException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import ExcelJS from 'exceljs';
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

  // --- Exportar a Excel ---------------------------------------------------
  // Mismo patrón que PersonsService.buildTemplateWorkbook: el service arma
  // el ExcelJS.Workbook, el controller lo serializa y lo manda con los
  // headers de descarga (ver PersonsController.downloadTemplate).
  //
  // Reporte "de verdad", no una tabla genérica: 6 hojas -- Resumen (con
  // secciones), Aportes por mes (con acumulado hacia la meta), Aportes por
  // aportante (ranking completo, no solo el top 5 que ya muestra la UI),
  // Detalle de aportes, Gastos por cuenta y Detalle de gastos. Formato
  // real (encabezados con relleno, moneda, porcentaje, panel congelado,
  // autofiltro) para que se pueda abrir y usar directo, no solo ver.
  async buildSummaryWorkbook(
    id: string,
    tenantId: string | null,
    user: RequestUser,
  ): Promise<{ workbook: ExcelJS.Workbook; projectName: string }> {
    const [project, contributions, expenses] = await Promise.all([
      this.findOne(id, tenantId, user),
      this.findContributions(id, tenantId, user),
      this.findExpenses(id, tenantId, user),
    ]);
    // findOne ya lanza NotFoundException si no existe/no es accesible —
    // este guard es solo para que TS estreche el tipo (withTotals lo tipa
    // como posible undefined por destructuring de arreglo bajo
    // noUncheckedIndexedAccess, aunque en la práctica siempre viene lleno).
    if (!project) throw new NotFoundException(`Proyecto "${id}" no encontrado`);

    const CURRENCY_FMT = '"$"#,##0.00';
    const PERCENT_FMT = '0.0%';
    const HEADER_FILL: ExcelJS.Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A5F' } };
    const HEADER_FONT: Partial<ExcelJS.Font> = { bold: true, color: { argb: 'FFFFFFFF' } };
    const SECTION_FILL: ExcelJS.Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8EEF5' } };
    const THIN_BORDER: Partial<ExcelJS.Borders> = {
      top: { style: 'thin', color: { argb: 'FFD9D9D9' } },
      bottom: { style: 'thin', color: { argb: 'FFD9D9D9' } },
    };

    function styleHeaderRow(row: ExcelJS.Row) {
      row.eachCell((cell) => {
        cell.fill = HEADER_FILL;
        cell.font = HEADER_FONT;
        cell.alignment = { vertical: 'middle' };
      });
      row.height = 20;
    }

    function styleDataRows(sheet: ExcelJS.Worksheet, firstDataRow: number) {
      for (let r = firstDataRow; r <= sheet.rowCount; r++) {
        sheet.getRow(r).eachCell((cell) => {
          cell.border = THIN_BORDER;
        });
      }
    }

    const totalContributed = Number(project.totalContributed);
    const totalSpent = Number(project.totalSpent);
    const goalAmount = Number(project.goalAmount);
    const percent = goalAmount > 0 ? totalContributed / goalAmount : 0;
    const daysRemaining = project.targetDate
      ? Math.ceil((new Date(project.targetDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      : null;

    type Contribution = (typeof contributions)[number];
    const contributorKey = (c: Contribution) => (c.person ? `p:${c.person.id}` : c.group ? `g:${c.group.id}` : 'anon');
    const contributorName = (c: Contribution) =>
      c.person ? `${c.person.firstName} ${c.person.lastName}` : c.group ? `Grupo: ${c.group.name}` : 'Anónimo';
    const contributorType = (c: Contribution) => (c.person ? 'Persona' : c.group ? 'Grupo' : '—');

    const sortedContributions = [...contributions].sort(
      (a, b) => new Date(a.contributedAt).getTime() - new Date(b.contributedAt).getTime(),
    );
    const sortedExpenses = [...expenses].sort(
      (a, b) => new Date(a.incurredAt).getTime() - new Date(b.incurredAt).getTime(),
    );

    const contributedPosted = contributions.filter((c) => c.journalEntryId).length;
    const expensesPosted = expenses.filter((e) => e.journalEntryId).length;
    const contributedPostedAmount = contributions.filter((c) => c.journalEntryId).reduce((s, c) => s + Number(c.amount), 0);
    const expensesPostedAmount = expenses.filter((e) => e.journalEntryId).reduce((s, e) => s + Number(e.amount), 0);

    const byContributor = new Map<string, { name: string; type: string; count: number; total: number; first: Date; last: Date }>();
    for (const c of contributions) {
      const key = contributorKey(c);
      const date = new Date(c.contributedAt);
      const entry = byContributor.get(key);
      if (entry) {
        entry.count += 1;
        entry.total += Number(c.amount);
        if (date < entry.first) entry.first = date;
        if (date > entry.last) entry.last = date;
      } else {
        byContributor.set(key, { name: contributorName(c), type: contributorType(c), count: 1, total: Number(c.amount), first: date, last: date });
      }
    }
    const contributorRanking = [...byContributor.values()].sort((a, b) => b.total - a.total);

    const byAccount = new Map<string, { name: string; count: number; total: number }>();
    for (const e of expenses) {
      const key = e.account.id;
      const entry = byAccount.get(key);
      const label = `${e.account.code} · ${e.account.name}`;
      if (entry) {
        entry.count += 1;
        entry.total += Number(e.amount);
      } else {
        byAccount.set(key, { name: label, count: 1, total: Number(e.amount) });
      }
    }
    const accountRanking = [...byAccount.values()].sort((a, b) => b.total - a.total);

    const byMonth = new Map<string, { count: number; total: number }>();
    for (const c of sortedContributions) {
      const d = new Date(c.contributedAt);
      const month = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const entry = byMonth.get(month) ?? { count: 0, total: 0 };
      entry.count += 1;
      entry.total += Number(c.amount);
      byMonth.set(month, entry);
    }
    const monthlyRows = [...byMonth.entries()].sort(([a], [b]) => a.localeCompare(b));

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'ISAI';
    workbook.created = new Date();

    // --- Hoja 1: Resumen ------------------------------------------------
    const summary = workbook.addWorksheet('Resumen', { views: [{ state: 'frozen', ySplit: 0 }] });
    summary.columns = [
      { key: 'label', width: 34 },
      { key: 'value', width: 24 },
    ];

    const addSectionTitle = (title: string) => {
      const row = summary.addRow([title]);
      summary.mergeCells(row.number, 1, row.number, 2);
      row.getCell(1).fill = SECTION_FILL;
      row.getCell(1).font = { bold: true, size: 12 };
      row.height = 20;
    };
    const addKv = (label: string, value: string | number | Date, fmt?: string) => {
      const row = summary.addRow([label, value]);
      row.getCell(1).font = { bold: true };
      if (fmt) row.getCell(2).numFmt = fmt;
    };

    const titleRow = summary.addRow([project.name]);
    summary.mergeCells(titleRow.number, 1, titleRow.number, 2);
    titleRow.getCell(1).font = { bold: true, size: 16 };
    titleRow.height = 26;
    if (project.description) {
      const descRow = summary.addRow([project.description]);
      summary.mergeCells(descRow.number, 1, descRow.number, 2);
      descRow.getCell(1).font = { italic: true, color: { argb: 'FF666666' } };
    }
    summary.addRow([]);

    addSectionTitle('Datos generales');
    addKv('Sucursal', project.branch.name);
    addKv('Estado', project.status === 'active' ? 'Activo' : project.status === 'completed' ? 'Completado' : 'Cancelado');
    addKv('Cuenta de ingreso', project.incomeAccount ? `${project.incomeAccount.code} · ${project.incomeAccount.name}` : 'Sin configurar');
    addKv('Fecha objetivo', project.targetDate ? new Date(project.targetDate) : 'Sin fecha');
    if (daysRemaining !== null) addKv('Días restantes', daysRemaining >= 0 ? daysRemaining : 'Vencido');
    summary.addRow([]);

    addSectionTitle('Finanzas');
    addKv('Meta', goalAmount, CURRENCY_FMT);
    addKv('Recaudado', totalContributed, CURRENCY_FMT);
    addKv('Gastado', totalSpent, CURRENCY_FMT);
    addKv('Disponible', totalContributed - totalSpent, CURRENCY_FMT);
    addKv('% de avance hacia la meta', percent, PERCENT_FMT);
    summary.addRow([]);

    addSectionTitle('Aportes');
    addKv('Aportantes distintos', byContributor.size);
    addKv('Aportes registrados', contributions.length);
    addKv('Aporte promedio', contributions.length > 0 ? totalContributed / contributions.length : 0, CURRENCY_FMT);
    addKv('Aporte más alto', contributions.length > 0 ? Math.max(...contributions.map((c) => Number(c.amount))) : 0, CURRENCY_FMT);
    addKv('Aporte más bajo', contributions.length > 0 ? Math.min(...contributions.map((c) => Number(c.amount))) : 0, CURRENCY_FMT);
    addKv('Contabilizados', `${contributedPosted} de ${contributions.length}`);
    addKv('Monto ya contabilizado', contributedPostedAmount, CURRENCY_FMT);
    addKv('Monto pendiente de contabilizar', totalContributed - contributedPostedAmount, CURRENCY_FMT);
    summary.addRow([]);

    addSectionTitle('Gastos');
    addKv('Gastos registrados', expenses.length);
    addKv('Contabilizados', `${expensesPosted} de ${expenses.length}`);
    addKv('Monto ya contabilizado', expensesPostedAmount, CURRENCY_FMT);
    addKv('Monto pendiente de contabilizar', totalSpent - expensesPostedAmount, CURRENCY_FMT);
    summary.addRow([]);
    summary.addRow(['Generado el', new Date()]).getCell(1).font = { italic: true, color: { argb: 'FF999999' } };

    // --- Hoja 2: Aportes por mes -----------------------------------------
    const monthlySheet = workbook.addWorksheet('Aportes por mes', { views: [{ state: 'frozen', ySplit: 1 }] });
    monthlySheet.columns = [
      { header: 'Mes', key: 'month', width: 12 },
      { header: '# Aportes', key: 'count', width: 12 },
      { header: 'Monto del mes', key: 'total', width: 16 },
      { header: 'Acumulado', key: 'cumulative', width: 16 },
      { header: '% de la meta acumulado', key: 'pctGoal', width: 20 },
    ];
    styleHeaderRow(monthlySheet.getRow(1));
    let cumulative = 0;
    for (const [month, { count, total }] of monthlyRows) {
      cumulative += total;
      monthlySheet.addRow({
        month,
        count,
        total,
        cumulative,
        pctGoal: goalAmount > 0 ? cumulative / goalAmount : 0,
      });
    }
    monthlySheet.getColumn('total').numFmt = CURRENCY_FMT;
    monthlySheet.getColumn('cumulative').numFmt = CURRENCY_FMT;
    monthlySheet.getColumn('pctGoal').numFmt = PERCENT_FMT;
    monthlySheet.autoFilter = { from: 'A1', to: 'E1' };
    styleDataRows(monthlySheet, 2);

    // --- Hoja 3: Aportes por aportante ------------------------------------
    const contributorSheet = workbook.addWorksheet('Aportes por aportante', { views: [{ state: 'frozen', ySplit: 1 }] });
    contributorSheet.columns = [
      { header: 'Aportante', key: 'name', width: 32 },
      { header: 'Tipo', key: 'type', width: 12 },
      { header: '# Aportes', key: 'count', width: 12 },
      { header: 'Monto total', key: 'total', width: 16 },
      { header: '% del total recaudado', key: 'pct', width: 20 },
      { header: 'Primer aporte', key: 'first', width: 16 },
      { header: 'Último aporte', key: 'last', width: 16 },
    ];
    styleHeaderRow(contributorSheet.getRow(1));
    for (const c of contributorRanking) {
      contributorSheet.addRow({
        name: c.name,
        type: c.type,
        count: c.count,
        total: c.total,
        pct: totalContributed > 0 ? c.total / totalContributed : 0,
        first: c.first,
        last: c.last,
      });
    }
    contributorSheet.getColumn('total').numFmt = CURRENCY_FMT;
    contributorSheet.getColumn('pct').numFmt = PERCENT_FMT;
    contributorSheet.getColumn('first').numFmt = 'dd/mm/yyyy';
    contributorSheet.getColumn('last').numFmt = 'dd/mm/yyyy';
    contributorSheet.autoFilter = { from: 'A1', to: 'G1' };
    styleDataRows(contributorSheet, 2);

    // --- Hoja 4: Detalle de aportes ---------------------------------------
    const contribSheet = workbook.addWorksheet('Detalle de aportes', { views: [{ state: 'frozen', ySplit: 1 }] });
    contribSheet.columns = [
      { header: 'Fecha', key: 'date', width: 14 },
      { header: 'Aportante', key: 'who', width: 30 },
      { header: 'Tipo', key: 'type', width: 12 },
      { header: 'Monto', key: 'amount', width: 14 },
      { header: 'Acumulado', key: 'cumulative', width: 16 },
      { header: 'Contabilizado', key: 'posted', width: 14 },
      { header: 'Notas', key: 'notes', width: 30 },
    ];
    styleHeaderRow(contribSheet.getRow(1));
    let runningTotal = 0;
    for (const c of sortedContributions) {
      runningTotal += Number(c.amount);
      contribSheet.addRow({
        date: new Date(c.contributedAt),
        who: contributorName(c),
        type: contributorType(c),
        amount: Number(c.amount),
        cumulative: runningTotal,
        posted: c.journalEntryId ? 'Sí' : 'No',
        notes: c.notes ?? '',
      });
    }
    contribSheet.getColumn('date').numFmt = 'dd/mm/yyyy';
    contribSheet.getColumn('amount').numFmt = CURRENCY_FMT;
    contribSheet.getColumn('cumulative').numFmt = CURRENCY_FMT;
    contribSheet.autoFilter = { from: 'A1', to: 'G1' };
    styleDataRows(contribSheet, 2);

    // --- Hoja 5: Gastos por cuenta -----------------------------------------
    const accountSheet = workbook.addWorksheet('Gastos por cuenta', { views: [{ state: 'frozen', ySplit: 1 }] });
    accountSheet.columns = [
      { header: 'Cuenta', key: 'name', width: 32 },
      { header: '# Gastos', key: 'count', width: 12 },
      { header: 'Monto total', key: 'total', width: 16 },
      { header: '% del total gastado', key: 'pct', width: 18 },
    ];
    styleHeaderRow(accountSheet.getRow(1));
    for (const a of accountRanking) {
      accountSheet.addRow({ name: a.name, count: a.count, total: a.total, pct: totalSpent > 0 ? a.total / totalSpent : 0 });
    }
    accountSheet.getColumn('total').numFmt = CURRENCY_FMT;
    accountSheet.getColumn('pct').numFmt = PERCENT_FMT;
    accountSheet.autoFilter = { from: 'A1', to: 'D1' };
    styleDataRows(accountSheet, 2);

    // --- Hoja 6: Detalle de gastos ------------------------------------------
    const expenseSheet = workbook.addWorksheet('Detalle de gastos', { views: [{ state: 'frozen', ySplit: 1 }] });
    expenseSheet.columns = [
      { header: 'Fecha', key: 'date', width: 14 },
      { header: 'Cuenta', key: 'account', width: 30 },
      { header: 'Monto', key: 'amount', width: 14 },
      { header: 'Acumulado', key: 'cumulative', width: 16 },
      { header: 'Contabilizado', key: 'posted', width: 14 },
      { header: 'Notas', key: 'notes', width: 30 },
    ];
    styleHeaderRow(expenseSheet.getRow(1));
    let runningSpent = 0;
    for (const e of sortedExpenses) {
      runningSpent += Number(e.amount);
      expenseSheet.addRow({
        date: new Date(e.incurredAt),
        account: `${e.account.code} · ${e.account.name}`,
        amount: Number(e.amount),
        cumulative: runningSpent,
        posted: e.journalEntryId ? 'Sí' : 'No',
        notes: e.notes ?? '',
      });
    }
    expenseSheet.getColumn('date').numFmt = 'dd/mm/yyyy';
    expenseSheet.getColumn('amount').numFmt = CURRENCY_FMT;
    expenseSheet.getColumn('cumulative').numFmt = CURRENCY_FMT;
    expenseSheet.autoFilter = { from: 'A1', to: 'F1' };
    styleDataRows(expenseSheet, 2);

    return { workbook, projectName: project.name };
  }
}
