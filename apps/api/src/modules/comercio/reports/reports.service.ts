import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { resolveAllBranchesScope, branchScopeSql } from '../../../common/utils/institution-scope.util';
import type { RequestUser } from '../../../common/decorators/current-user.decorator';

export interface ProductMarginRow {
  productId: string;
  sku: string | null;
  name: string;
  quantitySold: string;
  revenue: string;
  cost: string;
  margin: string;
  marginPercent: string;
}

export interface InventoryValuationRow {
  productId: string;
  sku: string | null;
  name: string;
  unitCode: string;
  quantity: string;
  averageCost: string;
  value: string;
}

// Reportería básica de tienda (docs/comercio-mejoras-propuestas.md §Fase 2,
// paso 8 del orden recomendado) — mismo patrón que finanzas/reports:
// $queryRaw crudo, alcance vía resolveAllBranchesScope+branchScopeSql (evita
// a propósito el bug real que se encontró en Presupuestos/Activos/Cierres:
// un filtro `branchId IN (...)` sin cubrir `branchId = null` deja invisible
// lo "de toda la institución" para un usuario con alcance de sucursal).
@Injectable()
export class ComercioReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async productMargin(
    institutionId: string,
    startDate: string | undefined,
    endDate: string | undefined,
    tenantId: string | null,
    user: RequestUser,
  ): Promise<ProductMarginRow[]> {
    if (!tenantId) return [];

    const effectiveStart = startDate ?? `${new Date().getUTCFullYear()}-${String(new Date().getUTCMonth() + 1).padStart(2, '0')}-01`;
    const effectiveEnd = endDate ?? new Date().toISOString().slice(0, 10);

    const scope = await resolveAllBranchesScope(this.prisma, user);
    const scopeFilter = branchScopeSql(scope, 's.institution_id', 's.branch_id');

    const rows = await this.prisma.$queryRaw<
      { product_id: string; sku: string | null; name: string; quantity_sold: string; revenue: string; cost: string }[]
    >`
      SELECT
        p.id AS product_id, p.sku, p.name,
        SUM(sl.quantity)::text AS quantity_sold,
        SUM(sl.quantity * sl.unit_price)::text AS revenue,
        SUM(sl.quantity * sl.unit_cost)::text AS cost
      FROM comercio.sale_lines sl
      JOIN comercio.sales s ON s.id = sl.sale_id
      JOIN inventario.products p ON p.id = sl.product_id
      WHERE s.tenant_id = ${tenantId}::uuid AND s.institution_id = ${institutionId}::uuid
        AND s.sale_date >= ${effectiveStart}::date AND s.sale_date <= ${effectiveEnd}::date
        AND ${scopeFilter}
      GROUP BY p.id, p.sku, p.name
      ORDER BY SUM(sl.quantity * sl.unit_price) DESC
    `;

    return rows.map((r) => {
      const revenue = new Prisma.Decimal(r.revenue);
      const cost = new Prisma.Decimal(r.cost);
      const margin = revenue.minus(cost);
      return {
        productId: r.product_id,
        sku: r.sku,
        name: r.name,
        quantitySold: r.quantity_sold,
        revenue: revenue.toString(),
        cost: cost.toString(),
        margin: margin.toString(),
        marginPercent: revenue.isZero() ? '0' : margin.dividedBy(revenue).times(100).toString(),
      };
    });
  }

  async inventoryValuation(institutionId: string, tenantId: string | null, user: RequestUser): Promise<InventoryValuationRow[]> {
    if (!tenantId) return [];

    const scope = await resolveAllBranchesScope(this.prisma, user);
    const scopeFilter = branchScopeSql(scope, 'b.institution_id', 'ps.branch_id');

    const rows = await this.prisma.$queryRaw<
      { product_id: string; sku: string | null; name: string; unit_code: string; quantity: string; average_cost: string }[]
    >`
      SELECT
        p.id AS product_id, p.sku, p.name, p.unit_code,
        SUM(ps.quantity)::text AS quantity,
        p.average_cost::text AS average_cost
      FROM inventario.product_stocks ps
      JOIN inventario.products p ON p.id = ps.product_id
      JOIN general.branches b ON b.id = ps.branch_id
      WHERE p.tenant_id = ${tenantId}::uuid AND b.institution_id = ${institutionId}::uuid
        AND ps.quantity > 0 AND ${scopeFilter}
      GROUP BY p.id, p.sku, p.name, p.unit_code, p.average_cost
      ORDER BY (SUM(ps.quantity) * p.average_cost) DESC
    `;

    return rows.map((r) => ({
      productId: r.product_id,
      sku: r.sku,
      name: r.name,
      unitCode: r.unit_code,
      quantity: r.quantity,
      averageCost: r.average_cost,
      value: new Prisma.Decimal(r.quantity).times(r.average_cost).toString(),
    }));
  }
}
