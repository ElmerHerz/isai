import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { DocumentSequencesService } from '../../general/document-sequences/document-sequences.service';
import {
  resolveAllBranchesScope,
  branchScopeSql,
  resolveInstitutionScope,
  resolveBranchScope,
  type AllBranchesScope,
} from '../../../common/utils/institution-scope.util';
import type { RequestUser } from '../../../common/decorators/current-user.decorator';
import { toCsv } from '../../../common/utils/csv.util';

const ACCOUNT_TYPE_CATALOG_CODE = 'account_type';
const CSV_HEADERS = ['Fecha', 'Sucursal', 'Código de cuenta', 'Cuenta', 'Descripción', 'Debe', 'Haber'];

export interface AccountBalanceNode {
  id: string;
  code: string;
  name: string;
  parentAccountId: string | null;
  ownAmount: string;
  total: string;
  isComputed?: boolean;
  children: AccountBalanceNode[];
}

export interface IncomeStatement {
  startDate: string;
  endDate: string;
  income: AccountBalanceNode[];
  expense: AccountBalanceNode[];
  totalIncome: string;
  totalExpense: string;
  netResult: string;
}

export interface BalanceSheet {
  asOfDate: string;
  assets: AccountBalanceNode[];
  liabilities: AccountBalanceNode[];
  equity: AccountBalanceNode[];
  totalAssets: string;
  totalLiabilities: string;
  totalEquity: string;
}

export interface BudgetVsActualRow {
  accountId: string;
  accountCode: string;
  accountName: string;
  budgeted: string;
  actual: string;
}

export interface FundSummaryRow {
  branch: string;
  group: string;
  project: string;
  account: string;
  totalDebit: string;
  totalCredit: string;
}

export interface DashboardKpis {
  incomeThisMonth: string;
  expenseThisMonth: string;
  cashBalance: string;
  pendingCount: number;
}

export interface MonthlyTrendRow {
  month: string;
  fundCode: string;
  total: string;
}

export interface DonorStatementLine {
  date: string;
  source: 'event_fund_collection' | 'project_contribution';
  description: string;
  amount: string;
}

export interface DonorStatement {
  person: { id: string; firstName: string; lastName: string };
  year: number;
  totalDonated: string;
  lines: DonorStatementLine[];
  /** Presente solo si ya se "Registró" el comprobante — ver registerDonorStatementReceipt. */
  receipt?: { documentNumber: string; generatedAt: string };
}

// Recorte 1: un solo reporte, la "consulta B" que dejó Claude Web en el SQL
// (totales por sucursal y grupo, agrupados también por cuenta) — sin fechas,
// sin balance general/estado de resultados formales, eso queda para fase 2.
@Injectable()
export class ReportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly documentSequences: DocumentSequencesService,
  ) {}

  async fundSummary(tenantId: string | null, user: RequestUser): Promise<FundSummaryRow[]> {
    if (!tenantId) return [];

    const scope = await resolveAllBranchesScope(this.prisma, user);
    const scopeFilter = branchScopeSql(scope, 'e.institution_id', 'e.branch_id');

    const rows = await this.prisma.$queryRaw<
      { branch: string | null; group: string | null; project: string | null; account: string; total_debit: string; total_credit: string }[]
    >`
      SELECT
        b.name AS branch,
        g.name AS "group",
        p.name AS project,
        a.name AS account,
        COALESCE(SUM(l.debit_amount), 0)::text AS total_debit,
        COALESCE(SUM(l.credit_amount), 0)::text AS total_credit
      FROM finanzas.journal_entry_lines l
      JOIN finanzas.journal_entries e ON e.id = l.journal_entry_id
      JOIN finanzas.accounts a ON a.id = l.account_id
      LEFT JOIN general.branches b ON b.id = e.branch_id
      LEFT JOIN membresia.groups g ON g.id = l.group_id
      LEFT JOIN proyectos.projects p ON p.id = l.project_id
      WHERE e.tenant_id = ${tenantId}::uuid AND e.status = 'posted' AND ${scopeFilter}
      GROUP BY b.name, g.name, p.name, a.name
      ORDER BY b.name NULLS FIRST, g.name NULLS FIRST, p.name NULLS FIRST, a.name
    `;

    return rows.map((r) => ({
      branch: r.branch ?? 'Toda la institución',
      group: r.group ?? '—',
      project: r.project ?? '—',
      account: r.account,
      totalDebit: r.total_debit,
      totalCredit: r.total_credit,
    }));
  }

  // Para queries que solo tienen institution_id disponible (el branch
  // efectivo de un evento puede venir de su grupo — lógica que hoy solo
  // vive en TS dentro de EventsService, no en SQL): "institución en
  // alcance" = una institución completa otorgada, O una institución que
  // contiene al menos una sucursal otorgada (nunca al revés — comparar un
  // id de sucursal contra ids de institución nunca matchearía). Usado por
  // dashboardKpis (pendientes de eventos) y monthlyTrend.
  private async institutionOnlyScopeSql(scope: AllBranchesScope, institutionCol: string): Promise<Prisma.Sql> {
    if (scope.unrestricted) return Prisma.sql`TRUE`;

    const branchInstitutionIds =
      scope.branchIds.length > 0
        ? (
            await this.prisma.branch.findMany({
              where: { id: { in: scope.branchIds } },
              select: { institutionId: true },
            })
          ).map((b) => b.institutionId)
        : [];
    const institutionIds = [...new Set([...scope.wholeInstitutionIds, ...branchInstitutionIds])];

    // Mismo cast ::text que branchScopeSql — Prisma.join(array) liga cada
    // elemento sin tipo, y Postgres no compara uuid = text sin cast
    // explícito (hallazgo real en /accounts, ver institution-scope.util.ts).
    return institutionIds.length > 0
      ? Prisma.sql`${Prisma.raw(institutionCol)}::text IN (${Prisma.join(institutionIds)})`
      : Prisma.sql`FALSE`;
  }

  // KPIs del panel de Finanzas: ingresos/gastos del mes en curso (solo
  // asientos posted), saldo actual de la Caja General de cada sucursal
  // (default_cash_account_id — el mismo criterio que ya usa el resto del
  // sistema para "dónde vive físicamente el efectivo"), y cuántos
  // movimientos siguen sin "Contabilizar" (ofrendas/diezmos/talentos +
  // aportes/gastos de proyecto con journal_entry_id null).
  async dashboardKpis(tenantId: string | null, user: RequestUser): Promise<DashboardKpis> {
    if (!tenantId) {
      return { incomeThisMonth: '0', expenseThisMonth: '0', cashBalance: '0', pendingCount: 0 };
    }

    const monthStart = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), 1))
      .toISOString()
      .slice(0, 10);

    const scope = await resolveAllBranchesScope(this.prisma, user);
    const entryScopeFilter = branchScopeSql(scope, 'e.institution_id', 'e.branch_id');
    const projectScopeFilter = branchScopeSql(scope, 'p.institution_id', 'p.branch_id');
    const eventInstitutionFilter = await this.institutionOnlyScopeSql(scope, 'i.id');

    const [[incomeRow], [expenseRow], [cashRow], [pendingRow]] = await Promise.all([
      this.prisma.$queryRaw<{ total: string }[]>`
        SELECT COALESCE(SUM(l.credit_amount - l.debit_amount), 0)::text AS total
        FROM finanzas.journal_entry_lines l
        JOIN finanzas.journal_entries e ON e.id = l.journal_entry_id
        JOIN finanzas.accounts a ON a.id = l.account_id
        JOIN general.catalog_items ct ON ct.id = a.account_type_id
        WHERE e.tenant_id = ${tenantId}::uuid AND e.status = 'posted' AND ct.code = 'INCOME'
          AND e.entry_date >= ${monthStart}::date AND ${entryScopeFilter}
      `,
      this.prisma.$queryRaw<{ total: string }[]>`
        SELECT COALESCE(SUM(l.debit_amount - l.credit_amount), 0)::text AS total
        FROM finanzas.journal_entry_lines l
        JOIN finanzas.journal_entries e ON e.id = l.journal_entry_id
        JOIN finanzas.accounts a ON a.id = l.account_id
        JOIN general.catalog_items ct ON ct.id = a.account_type_id
        WHERE e.tenant_id = ${tenantId}::uuid AND e.status = 'posted' AND ct.code = 'EXPENSE'
          AND e.entry_date >= ${monthStart}::date AND ${entryScopeFilter}
      `,
      this.prisma.$queryRaw<{ total: string }[]>`
        SELECT COALESCE(SUM(l.debit_amount - l.credit_amount), 0)::text AS total
        FROM finanzas.journal_entry_lines l
        JOIN finanzas.journal_entries e ON e.id = l.journal_entry_id
        JOIN general.branches b ON b.default_cash_account_id = l.account_id
        WHERE e.tenant_id = ${tenantId}::uuid AND e.status = 'posted' AND ${entryScopeFilter}
      `,
      this.prisma.$queryRaw<{ total: bigint }[]>`
        SELECT
          (SELECT count(*)::int FROM membresia.event_fund_collections fc
             JOIN membresia.events ev ON ev.id = fc.event_id
             JOIN general.institutions i ON i.id = ev.institution_id
             WHERE i.tenant_id = ${tenantId}::uuid AND fc.journal_entry_id IS NULL AND ${eventInstitutionFilter})
          + (SELECT count(*)::int FROM proyectos.project_contributions pc
               JOIN proyectos.projects p ON p.id = pc.project_id
               WHERE p.tenant_id = ${tenantId}::uuid AND pc.journal_entry_id IS NULL AND ${projectScopeFilter})
          + (SELECT count(*)::int FROM proyectos.project_expenses pe
               JOIN proyectos.projects p ON p.id = pe.project_id
               WHERE p.tenant_id = ${tenantId}::uuid AND pe.journal_entry_id IS NULL AND ${projectScopeFilter})
          AS total
      `,
    ]);

    return {
      incomeThisMonth: incomeRow?.total ?? '0',
      expenseThisMonth: expenseRow?.total ?? '0',
      cashBalance: cashRow?.total ?? '0',
      pendingCount: Number(pendingRow?.total ?? 0),
    };
  }

  // Tendencia mensual de ofrenda/diezmo/talento — se agrega directo desde
  // event_fund_collections (no desde asientos contables): lo que importa
  // acá es cuánto se RECOGIÓ por tipo de fondo cada mes, sin importar si ya
  // se contabilizó o no (mismo criterio que Project.totalContributed).
  // Alcance solo por institución, mismo motivo/documentación que
  // dashboardKpis (branch efectivo de un evento puede venir de su grupo).
  async monthlyTrend(tenantId: string | null, user: RequestUser): Promise<MonthlyTrendRow[]> {
    if (!tenantId) return [];

    const scope = await resolveAllBranchesScope(this.prisma, user);
    const institutionFilter = await this.institutionOnlyScopeSql(scope, 'i.id');

    const rows = await this.prisma.$queryRaw<{ month: string; fund_code: string; total: string }[]>`
      SELECT
        to_char(date_trunc('month', ev.event_date), 'YYYY-MM') AS month,
        ft.code AS fund_code,
        SUM(fc.amount)::text AS total
      FROM membresia.event_fund_collections fc
      JOIN membresia.events ev ON ev.id = fc.event_id
      JOIN membresia.fund_types ft ON ft.id = fc.fund_type_id
      JOIN general.institutions i ON i.id = ev.institution_id
      WHERE i.tenant_id = ${tenantId}::uuid
        AND ev.event_date >= (CURRENT_DATE - INTERVAL '6 months')
        AND ${institutionFilter}
      GROUP BY 1, 2
      ORDER BY 1
    `;

    return rows.map((r) => ({ month: r.month, fundCode: r.fund_code, total: r.total }));
  }

  // Saldo por cuenta en su signo NATURAL (mismo criterio que
  // AccountsService.findAll — CREDIT: haber-debe, resto: debe-haber) para
  // cualquier rango de fechas y cualquier subconjunto de tipos de cuenta.
  // Reutilizado por incomeStatement (rango de fechas) y balanceSheet
  // (acumulado hasta una fecha) para no duplicar el CASE dos veces.
  private async accountTotals(
    tenantId: string,
    typeCodes: string[],
    dateFilter: Prisma.Sql,
  ): Promise<Map<string, string>> {
    const rows = await this.prisma.$queryRaw<{ account_id: string; total: string }[]>`
      SELECT l.account_id, COALESCE(SUM(
        CASE WHEN a.normal_balance = 'CREDIT' THEN l.credit_amount - l.debit_amount
             ELSE l.debit_amount - l.credit_amount END
      ), 0)::text AS total
      FROM finanzas.journal_entry_lines l
      JOIN finanzas.journal_entries e ON e.id = l.journal_entry_id
      JOIN finanzas.accounts a ON a.id = l.account_id
      JOIN general.catalog_items ct ON ct.id = a.account_type_id
      WHERE a.tenant_id = ${tenantId}::uuid AND e.status = 'posted'
        AND ct.catalog_code = ${ACCOUNT_TYPE_CATALOG_CODE} AND ct.code IN (${Prisma.join(typeCodes)})
        AND ${dateFilter}
      GROUP BY l.account_id
    `;
    return new Map(rows.map((r) => [r.account_id, r.total]));
  }

  private async accountsByType(tenantId: string, typeCodes: string[]) {
    return this.prisma.account.findMany({
      where: {
        tenantId,
        accountType: { catalogCode: ACCOUNT_TYPE_CATALOG_CODE, code: { in: typeCodes } },
      },
      select: { id: true, code: true, name: true, parentAccountId: true },
      orderBy: { code: 'asc' },
    });
  }

  // Arma el árbol de cuentas (padre→hijos vía parentAccountId, ya existente
  // y ya usado para la indentación visual del catálogo) con el saldo de cada
  // cuenta y el "rollup" (saldo propio + de todos los descendientes) — un
  // total por nivel sin necesitar una estructura nueva en la base.
  private buildTree(
    accounts: { id: string; code: string; name: string; parentAccountId: string | null }[],
    totals: Map<string, string>,
  ): AccountBalanceNode[] {
    const byParent = new Map<string | null, typeof accounts>();
    for (const a of accounts) {
      const key = a.parentAccountId;
      if (!byParent.has(key)) byParent.set(key, []);
      byParent.get(key)!.push(a);
    }
    const build = (account: (typeof accounts)[number]): AccountBalanceNode => {
      const children = (byParent.get(account.id) ?? []).map(build);
      const own = new Prisma.Decimal(totals.get(account.id) ?? 0);
      const total = children.reduce((sum, c) => sum.plus(c.total), own);
      return {
        id: account.id,
        code: account.code,
        name: account.name,
        parentAccountId: account.parentAccountId,
        ownAmount: own.toString(),
        total: total.toString(),
        children,
      };
    };
    return (byParent.get(null) ?? []).map(build);
  }

  private sumTotals(nodes: AccountBalanceNode[]): Prisma.Decimal {
    return nodes.reduce((sum, n) => sum.plus(n.total), new Prisma.Decimal(0));
  }

  async incomeStatement(
    tenantId: string | null,
    user: RequestUser,
    startDate?: string,
    endDate?: string,
  ): Promise<IncomeStatement> {
    const effectiveStart = startDate ?? `${new Date().getUTCFullYear()}-01-01`;
    const effectiveEnd = endDate ?? new Date().toISOString().slice(0, 10);

    if (!tenantId) {
      return { startDate: effectiveStart, endDate: effectiveEnd, income: [], expense: [], totalIncome: '0', totalExpense: '0', netResult: '0' };
    }

    const scope = await resolveAllBranchesScope(this.prisma, user);
    const scopeFilter = branchScopeSql(scope, 'e.institution_id', 'e.branch_id');
    const dateFilter = Prisma.sql`e.entry_date >= ${effectiveStart}::date AND e.entry_date <= ${effectiveEnd}::date AND ${scopeFilter}`;

    const [incomeAccounts, expenseAccounts, totals] = await Promise.all([
      this.accountsByType(tenantId, ['INCOME']),
      this.accountsByType(tenantId, ['EXPENSE']),
      this.accountTotals(tenantId, ['INCOME', 'EXPENSE'], dateFilter),
    ]);

    const income = this.buildTree(incomeAccounts, totals);
    const expense = this.buildTree(expenseAccounts, totals);
    const totalIncome = this.sumTotals(income);
    const totalExpense = this.sumTotals(expense);

    return {
      startDate: effectiveStart,
      endDate: effectiveEnd,
      income,
      expense,
      totalIncome: totalIncome.toString(),
      totalExpense: totalExpense.toString(),
      netResult: totalIncome.minus(totalExpense).toString(),
    };
  }

  async balanceSheet(tenantId: string | null, user: RequestUser, asOfDate?: string): Promise<BalanceSheet> {
    const effectiveDate = asOfDate ?? new Date().toISOString().slice(0, 10);

    if (!tenantId) {
      return { asOfDate: effectiveDate, assets: [], liabilities: [], equity: [], totalAssets: '0', totalLiabilities: '0', totalEquity: '0' };
    }

    const scope = await resolveAllBranchesScope(this.prisma, user);
    const scopeFilter = branchScopeSql(scope, 'e.institution_id', 'e.branch_id');
    const dateFilter = Prisma.sql`e.entry_date <= ${effectiveDate}::date AND ${scopeFilter}`;

    const [assetAccounts, liabilityAccounts, equityAccounts, totals, resultRows] = await Promise.all([
      this.accountsByType(tenantId, ['ASSET']),
      this.accountsByType(tenantId, ['LIABILITY']),
      this.accountsByType(tenantId, ['EQUITY']),
      this.accountTotals(tenantId, ['ASSET', 'LIABILITY', 'EQUITY'], dateFilter),
      // Resultado acumulado a la fecha (INCOME − EXPENSE, mismo signo natural)
      // — se calcula al vuelo y se muestra como una línea más, sin escribir
      // nada a la base. Con Cierre de periodo (§9.1, PeriodClosingsService)
      // esto no necesita cambiar: cerrar un periodo deja las cuentas de
      // Ingreso/Gasto en cero hasta esa fecha (vía el asiento de cierre), así
      // que esta suma acumulada desde el origen automáticamente pasa a
      // representar solo lo no cerrado todavía.
      this.prisma.$queryRaw<{ total: string }[]>`
        SELECT COALESCE(SUM(
          CASE WHEN ct.code = 'INCOME' THEN l.credit_amount - l.debit_amount
               ELSE l.debit_amount - l.credit_amount END
        ), 0)::text AS total
        FROM finanzas.journal_entry_lines l
        JOIN finanzas.journal_entries e ON e.id = l.journal_entry_id
        JOIN finanzas.accounts a ON a.id = l.account_id
        JOIN general.catalog_items ct ON ct.id = a.account_type_id
        WHERE a.tenant_id = ${tenantId}::uuid AND e.status = 'posted'
          AND ct.catalog_code = ${ACCOUNT_TYPE_CATALOG_CODE} AND ct.code IN ('INCOME', 'EXPENSE')
          AND ${dateFilter}
      `,
    ]);

    const assets = this.buildTree(assetAccounts, totals);
    const liabilities = this.buildTree(liabilityAccounts, totals);
    const equity = this.buildTree(equityAccounts, totals);

    const netResult = resultRows[0]?.total ?? '0';
    equity.push({
      id: 'accumulated-results',
      code: '—',
      name: 'Resultados acumulados',
      parentAccountId: null,
      ownAmount: netResult,
      total: netResult,
      isComputed: true,
      children: [],
    });

    return {
      asOfDate: effectiveDate,
      assets,
      liabilities,
      equity,
      totalAssets: this.sumTotals(assets).toString(),
      totalLiabilities: this.sumTotals(liabilities).toString(),
      totalEquity: this.sumTotals(equity).toString(),
    };
  }

  // Fase 4 §9.3 — CSV genérico (fecha, cuenta, descripción, debe, haber) del
  // detalle de asientos para que un contador externo lo importe a su propio
  // software. Mismo criterio de scope/fechas que incomeStatement, solo
  // asientos 'posted' (mismo filtro que el resto de reportes).
  async exportEntriesCsv(tenantId: string | null, user: RequestUser, startDate?: string, endDate?: string): Promise<string> {
    const effectiveStart = startDate ?? `${new Date().getUTCFullYear()}-01-01`;
    const effectiveEnd = endDate ?? new Date().toISOString().slice(0, 10);

    if (!tenantId) return toCsv(CSV_HEADERS, []);

    const scope = await resolveAllBranchesScope(this.prisma, user);
    const scopeFilter = branchScopeSql(scope, 'e.institution_id', 'e.branch_id');

    const rows = await this.prisma.$queryRaw<
      { entry_date: Date; branch_name: string | null; account_code: string; account_name: string; description: string; debit_amount: string; credit_amount: string }[]
    >`
      SELECT e.entry_date, b.name AS branch_name, a.code AS account_code, a.name AS account_name,
             COALESCE(l.description, e.description, '') AS description,
             l.debit_amount::text AS debit_amount, l.credit_amount::text AS credit_amount
      FROM finanzas.journal_entry_lines l
      JOIN finanzas.journal_entries e ON e.id = l.journal_entry_id
      JOIN finanzas.accounts a ON a.id = l.account_id
      LEFT JOIN general.branches b ON b.id = e.branch_id
      WHERE e.tenant_id = ${tenantId}::uuid AND e.status = 'posted'
        AND e.entry_date >= ${effectiveStart}::date AND e.entry_date <= ${effectiveEnd}::date
        AND ${scopeFilter}
      ORDER BY e.entry_date ASC, e.id ASC
    `;

    return toCsv(
      CSV_HEADERS,
      rows.map((r) => [
        r.entry_date.toISOString().slice(0, 10),
        r.branch_name ?? 'Toda la institución',
        r.account_code,
        r.account_name,
        r.description,
        r.debit_amount,
        r.credit_amount,
      ]),
    );
  }

  // Fase 2 §7.1 — presupuestado vs. real de un mes puntual, por cuenta. El
  // budget YA decide su propio alcance de sucursal (institutionId/branchId
  // fijos al crearlo) — mismo criterio de accesibilidad que
  // BudgetsService.assertBudgetAccessible, no branchScopeSql del usuario acá
  // (ya se validó que el usuario puede ver ESTE budget en particular).
  async budgetVsActual(budgetId: string, month: string, tenantId: string | null, user: RequestUser): Promise<BudgetVsActualRow[]> {
    const budget = await this.prisma.budget.findFirst({
      where: { id: budgetId, ...(tenantId ? { tenantId } : {}) },
      include: { lines: { include: { account: { select: { id: true, code: true, name: true } } } } },
    });
    if (!budget) throw new NotFoundException(`Presupuesto "${budgetId}" no encontrado`);

    if (!user.isSuperadmin) {
      const institutionScope = await resolveInstitutionScope(this.prisma, user);
      if (!institutionScope.unrestricted && !institutionScope.institutionIds.includes(budget.institutionId)) {
        throw new NotFoundException(`Presupuesto "${budgetId}" no encontrado`);
      }
      const branchScope = await resolveBranchScope(this.prisma, { ...user, institutionId: budget.institutionId });
      if (!branchScope.unrestricted && (!budget.branchId || !branchScope.branchIds.includes(budget.branchId))) {
        throw new NotFoundException(`Presupuesto "${budgetId}" no encontrado`);
      }
    }

    if (budget.lines.length === 0) return [];

    const monthStart = `${month}-01`;
    const accountIds = budget.lines.map((l) => l.accountId);

    const actualRows = await this.prisma.$queryRaw<{ account_id: string; total: string }[]>`
      SELECT l.account_id, COALESCE(SUM(
        CASE WHEN a.normal_balance = 'CREDIT' THEN l.credit_amount - l.debit_amount
             ELSE l.debit_amount - l.credit_amount END
      ), 0)::text AS total
      FROM finanzas.journal_entry_lines l
      JOIN finanzas.journal_entries e ON e.id = l.journal_entry_id
      JOIN finanzas.accounts a ON a.id = l.account_id
      WHERE e.status = 'posted' AND l.account_id = ANY(${accountIds}::uuid[])
        AND e.entry_date >= ${monthStart}::date
        AND e.entry_date < (${monthStart}::date + INTERVAL '1 month')
        AND e.institution_id = ${budget.institutionId}::uuid
        AND (${budget.branchId}::uuid IS NULL OR e.branch_id = ${budget.branchId}::uuid)
      GROUP BY l.account_id
    `;
    const actualByAccount = new Map(actualRows.map((r) => [r.account_id, r.total]));

    return budget.lines.map((line) => ({
      accountId: line.accountId,
      accountCode: line.account.code,
      accountName: line.account.name,
      budgeted: line.monthlyAmount.toString(),
      actual: actualByAccount.get(line.accountId) ?? '0',
    }));
  }

  // --- Comprobantes de donación (§8.1) -------------------------------------
  // Junta dos orígenes de dinero identificado por persona: ofrendas/diezmos
  // con donante identificado (event_fund_collection_donors, opcional por
  // tipo de fondo) y aportes a Proyectos (project_contributions, siempre
  // identificados). Solo lectura — nunca asigna folio (ver
  // registerDonorStatementReceipt para eso).

  private async getPersonForDonorStatement(personId: string, tenantId: string | null) {
    const person = await this.prisma.person.findFirst({
      where: { id: personId, ...(tenantId ? { tenantId } : {}), deletedAt: null },
      select: { id: true, tenantId: true, firstName: true, lastName: true },
    });
    if (!person) throw new NotFoundException(`Persona "${personId}" no encontrada`);
    return person;
  }

  async getDonorStatement(personId: string, year: number, tenantId: string | null, user: RequestUser): Promise<DonorStatement> {
    const person = await this.getPersonForDonorStatement(personId, tenantId);
    const yearStart = new Date(Date.UTC(year, 0, 1));
    const yearEnd = new Date(Date.UTC(year + 1, 0, 1));

    const [donorLines, contributions, receipt] = await Promise.all([
      this.prisma.eventFundCollectionDonor.findMany({
        where: {
          personId,
          collection: { event: { eventDate: { gte: yearStart, lt: yearEnd } } },
        },
        include: { collection: { include: { fundType: true, event: { select: { title: true, eventDate: true } } } } },
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.projectContribution.findMany({
        where: { personId, contributedAt: { gte: yearStart, lt: yearEnd } },
        include: { project: { select: { name: true } } },
        orderBy: { contributedAt: 'asc' },
      }),
      this.prisma.donorStatementReceipt.findUnique({
        where: { uq_donor_statement_receipts_scope: { tenantId: person.tenantId, personId, year } },
      }),
    ]);

    const lines: DonorStatementLine[] = [
      ...donorLines.map((d) => ({
        date: d.collection.event.eventDate.toISOString().slice(0, 10),
        source: 'event_fund_collection' as const,
        description: `${d.collection.fundType.name} — ${d.collection.event.title}`,
        amount: d.amount.toString(),
      })),
      ...contributions.map((c) => ({
        date: c.contributedAt.toISOString().slice(0, 10),
        source: 'project_contribution' as const,
        description: `Aporte a proyecto: ${c.project.name}`,
        amount: c.amount.toString(),
      })),
    ].sort((a, b) => a.date.localeCompare(b.date));

    const totalDonated = lines.reduce((sum, l) => sum.plus(l.amount), new Prisma.Decimal(0)).toString();

    return {
      person: { id: person.id, firstName: person.firstName, lastName: person.lastName },
      year,
      totalDonated,
      lines,
      receipt: receipt ? { documentNumber: receipt.documentNumber, generatedAt: receipt.generatedAt.toISOString() } : undefined,
    };
  }

  // "Registrar" — acción explícita y separada de "Descargar" (ver plan de
  // sesión: el folio de un comprobante anual no puede regenerarse en cada
  // descarga, así que nunca es un efecto secundario de leer/previsualizar).
  // Idempotente: registrar dos veces la misma persona+año nunca asigna un
  // segundo folio, devuelve el ya existente.
  async registerDonorStatementReceipt(
    personId: string,
    year: number,
    tenantId: string | null,
    user: RequestUser,
  ): Promise<{ documentNumber: string; generatedAt: string }> {
    const person = await this.getPersonForDonorStatement(personId, tenantId);

    const existing = await this.prisma.donorStatementReceipt.findUnique({
      where: { uq_donor_statement_receipts_scope: { tenantId: person.tenantId, personId, year } },
    });
    if (existing) {
      return { documentNumber: existing.documentNumber, generatedAt: existing.generatedAt.toISOString() };
    }

    const receipt = await this.prisma.$transaction(async (tx) => {
      const documentNumber = await this.documentSequences.getNextDocumentNumber(tx, {
        tenantId: person.tenantId,
        branchId: null,
        documentTypeCode: 'donor_receipt',
      });

      // upsert (INSERT ... ON CONFLICT DO UPDATE) es atómico a nivel de fila
      // — dos "Registrar" simultáneos para la misma persona+año nunca crean
      // dos filas. Ventana aceptada y documentada: si de verdad chocan, el
      // perdedor ya llamó getNextDocumentNumber de más arriba y ese folio
      // queda saltado en la secuencia (gap, no duplicado) — mismo costo que
      // cualquier numeración real con documentos cancelados, no una
      // inconsistencia de datos.
      return tx.donorStatementReceipt.upsert({
        where: { uq_donor_statement_receipts_scope: { tenantId: person.tenantId, personId, year } },
        create: { tenantId: person.tenantId, personId, year, documentNumber, generatedBy: user.userId },
        update: {},
      });
    });

    return { documentNumber: receipt.documentNumber, generatedAt: receipt.generatedAt.toISOString() };
  }

  async buildDonorStatementForPdf(personId: string, year: number, tenantId: string | null, user: RequestUser) {
    const statement = await this.getDonorStatement(personId, year, tenantId, user);
    if (!statement.receipt) {
      throw new BadRequestException('Este comprobante todavía no se ha registrado — regístralo antes de descargarlo.');
    }

    const personWithInstitution = await this.prisma.person.findUniqueOrThrow({
      where: { id: personId },
      select: { institution: { select: { name: true } } },
    });

    return { statement, institutionName: personWithInstitution.institution.name };
  }
}
