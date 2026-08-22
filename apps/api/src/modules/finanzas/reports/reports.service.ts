import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';

export interface FundSummaryRow {
  branch: string;
  group: string;
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

// Recorte 1: un solo reporte, la "consulta B" que dejó Claude Web en el SQL
// (totales por sucursal y grupo, agrupados también por cuenta) — sin fechas,
// sin balance general/estado de resultados formales, eso queda para fase 2.
@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async fundSummary(tenantId: string | null): Promise<FundSummaryRow[]> {
    if (!tenantId) return [];

    const rows = await this.prisma.$queryRaw<
      { branch: string | null; group: string | null; account: string; total_debit: string; total_credit: string }[]
    >`
      SELECT
        b.name AS branch,
        g.name AS "group",
        a.name AS account,
        COALESCE(SUM(l.debit_amount), 0)::text AS total_debit,
        COALESCE(SUM(l.credit_amount), 0)::text AS total_credit
      FROM finanzas.journal_entry_lines l
      JOIN finanzas.journal_entries e ON e.id = l.journal_entry_id
      JOIN finanzas.accounts a ON a.id = l.account_id
      LEFT JOIN general.branches b ON b.id = e.branch_id
      LEFT JOIN membresia.groups g ON g.id = l.group_id
      WHERE e.tenant_id = ${tenantId}::uuid AND e.status = 'posted'
      GROUP BY b.name, g.name, a.name
      ORDER BY b.name NULLS FIRST, g.name NULLS FIRST, a.name
    `;

    return rows.map((r) => ({
      branch: r.branch ?? 'Toda la institución',
      group: r.group ?? '—',
      account: r.account,
      totalDebit: r.total_debit,
      totalCredit: r.total_credit,
    }));
  }

  // KPIs del panel de Finanzas: ingresos/gastos del mes en curso (solo
  // asientos posted), saldo actual de la Caja General de cada sucursal
  // (default_cash_account_id — el mismo criterio que ya usa el resto del
  // sistema para "dónde vive físicamente el efectivo"), y cuántos
  // movimientos siguen sin "Contabilizar" (ofrendas/diezmos/talentos +
  // aportes/gastos de proyecto con journal_entry_id null).
  async dashboardKpis(tenantId: string | null): Promise<DashboardKpis> {
    if (!tenantId) {
      return { incomeThisMonth: '0', expenseThisMonth: '0', cashBalance: '0', pendingCount: 0 };
    }

    const monthStart = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), 1))
      .toISOString()
      .slice(0, 10);

    const [[incomeRow], [expenseRow], [cashRow], [pendingRow]] = await Promise.all([
      this.prisma.$queryRaw<{ total: string }[]>`
        SELECT COALESCE(SUM(l.credit_amount - l.debit_amount), 0)::text AS total
        FROM finanzas.journal_entry_lines l
        JOIN finanzas.journal_entries e ON e.id = l.journal_entry_id
        JOIN finanzas.accounts a ON a.id = l.account_id
        JOIN general.catalog_items ct ON ct.id = a.account_type_id
        WHERE e.tenant_id = ${tenantId}::uuid AND e.status = 'posted' AND ct.code = 'INCOME'
          AND e.entry_date >= ${monthStart}::date
      `,
      this.prisma.$queryRaw<{ total: string }[]>`
        SELECT COALESCE(SUM(l.debit_amount - l.credit_amount), 0)::text AS total
        FROM finanzas.journal_entry_lines l
        JOIN finanzas.journal_entries e ON e.id = l.journal_entry_id
        JOIN finanzas.accounts a ON a.id = l.account_id
        JOIN general.catalog_items ct ON ct.id = a.account_type_id
        WHERE e.tenant_id = ${tenantId}::uuid AND e.status = 'posted' AND ct.code = 'EXPENSE'
          AND e.entry_date >= ${monthStart}::date
      `,
      this.prisma.$queryRaw<{ total: string }[]>`
        SELECT COALESCE(SUM(l.debit_amount - l.credit_amount), 0)::text AS total
        FROM finanzas.journal_entry_lines l
        JOIN finanzas.journal_entries e ON e.id = l.journal_entry_id
        JOIN general.branches b ON b.default_cash_account_id = l.account_id
        WHERE e.tenant_id = ${tenantId}::uuid AND e.status = 'posted'
      `,
      this.prisma.$queryRaw<{ total: bigint }[]>`
        SELECT
          (SELECT count(*)::int FROM membresia.event_fund_collections fc
             JOIN membresia.events ev ON ev.id = fc.event_id
             JOIN general.institutions i ON i.id = ev.institution_id
             WHERE i.tenant_id = ${tenantId}::uuid AND fc.journal_entry_id IS NULL)
          + (SELECT count(*)::int FROM finanzas.project_contributions pc
               JOIN finanzas.projects p ON p.id = pc.project_id
               WHERE p.tenant_id = ${tenantId}::uuid AND pc.journal_entry_id IS NULL)
          + (SELECT count(*)::int FROM finanzas.project_expenses pe
               JOIN finanzas.projects p ON p.id = pe.project_id
               WHERE p.tenant_id = ${tenantId}::uuid AND pe.journal_entry_id IS NULL)
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
  async monthlyTrend(tenantId: string | null): Promise<MonthlyTrendRow[]> {
    if (!tenantId) return [];

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
      GROUP BY 1, 2
      ORDER BY 1
    `;

    return rows.map((r) => ({ month: r.month, fundCode: r.fund_code, total: r.total }));
  }
}
