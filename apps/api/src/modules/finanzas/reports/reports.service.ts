import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';

export interface FundSummaryRow {
  branch: string;
  group: string;
  account: string;
  totalDebit: string;
  totalCredit: string;
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
}
