import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { LedgerService } from '../../finanzas/ledger/ledger.service';
import { AdjustStockDto } from './dto/adjust-stock.dto';
import { ConsumeStockDto } from './dto/consume-stock.dto';
import type { RequestUser } from '../../../common/decorators/current-user.decorator';

const ACCOUNT_TYPE_CATALOG_CODE = 'account_type';

// Existencias y movimientos (docs/comercio-mejoras-propuestas.md §3, §3.1).
// applyMovement es el único lugar que toca ProductStock/InventoryMovement —
// mismo espíritu que LedgerService.postEntry: recibe la tx ya abierta por el
// caller, nunca abre la suya propia.
@Injectable()
export class InventoryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ledger: LedgerService,
  ) {}

  // Sin chequear tracksInventory acá a propósito — esto lo usan también las
  // lecturas (getStockByProduct/getMovementsByProduct), que deben poder
  // devolver "sin existencia"/"sin movimientos" para cualquier producto, no
  // rechazar la consulta. El chequeo de tracksInventory es solo para las
  // acciones que ESCRIBEN (ver assertTracksInventory).
  private async findProductOrThrow(productId: string, tenantId: string) {
    const product = await this.prisma.product.findFirst({ where: { id: productId, tenantId } });
    if (!product) throw new NotFoundException(`Producto "${productId}" no encontrado`);
    return product;
  }

  private assertTracksInventory(product: { tracksInventory: boolean }) {
    if (!product.tracksInventory) {
      throw new BadRequestException('Este producto no lleva control de existencia.');
    }
  }

  private async assertBranchBelongsToTenant(branchId: string, tenantId: string) {
    const branch = await this.prisma.branch.findFirst({
      where: { id: branchId, institution: { tenantId } },
    });
    if (!branch) throw new BadRequestException('Esa sucursal no pertenece a este tenant.');
    return branch;
  }

  async applyMovement(
    tx: Prisma.TransactionClient,
    input: {
      productId: string;
      branchId: string;
      movementType: string;
      quantity: Prisma.Decimal.Value;
      unitCost?: Prisma.Decimal.Value;
      sourceType: string;
      sourceId?: string;
      notes?: string;
      createdBy?: string;
    },
  ) {
    const product = await tx.product.findUniqueOrThrow({ where: { id: input.productId } });
    const quantity = new Prisma.Decimal(input.quantity);

    // Product.averageCost es un solo valor por producto (no por sucursal) —
    // el costo promedio ponderado se recalcula contra la existencia TOTAL en
    // todas las sucursales, no solo la que se está tocando.
    if (input.unitCost != null && quantity.greaterThan(0)) {
      const totalRow = await tx.productStock.aggregate({
        where: { productId: input.productId },
        _sum: { quantity: true },
      });
      const totalBefore = totalRow._sum.quantity ?? new Prisma.Decimal(0);
      const unitCost = new Prisma.Decimal(input.unitCost);
      const totalAfter = totalBefore.plus(quantity);
      const newAverageCost = totalAfter.isZero()
        ? unitCost
        : totalBefore.times(product.averageCost).plus(quantity.times(unitCost)).dividedBy(totalAfter);
      await tx.product.update({ where: { id: input.productId }, data: { averageCost: newAverageCost } });
    }

    const existingStock = await tx.productStock.findUnique({
      where: { uq_product_stocks_product_branch: { productId: input.productId, branchId: input.branchId } },
    });
    const currentQuantity = existingStock?.quantity ?? new Prisma.Decimal(0);
    const newQuantity = currentQuantity.plus(quantity);
    if (newQuantity.lessThan(0)) {
      throw new BadRequestException('Existencia insuficiente en esa sucursal.');
    }

    await tx.productStock.upsert({
      where: { uq_product_stocks_product_branch: { productId: input.productId, branchId: input.branchId } },
      create: { productId: input.productId, branchId: input.branchId, quantity: newQuantity },
      update: { quantity: newQuantity },
    });

    await tx.inventoryMovement.create({
      data: {
        productId: input.productId,
        branchId: input.branchId,
        movementType: input.movementType,
        quantity,
        unitCost: input.unitCost,
        sourceType: input.sourceType,
        sourceId: input.sourceId,
        notes: input.notes,
        createdBy: input.createdBy,
      },
    });
  }

  async getStockByProduct(productId: string, tenantId: string | null) {
    if (!tenantId) return [];
    await this.findProductOrThrow(productId, tenantId);
    return this.prisma.productStock.findMany({
      where: { productId },
      include: { branch: { select: { id: true, name: true } } },
      orderBy: { branch: { name: 'asc' } },
    });
  }

  // Historial inmutable — sin esto, un ajuste seguido de un uso interno que
  // se cancelan entre sí (ej. +10 y luego -10) no deja ningún rastro visible
  // en la tabla de existencia (queda en 0), aunque ambos movimientos sí
  // pasaron y ya se ven reflejados en Finanzas (el uso interno, vía su
  // asiento). Hallazgo de sesión: faltaba esta vista.
  async getMovementsByProduct(productId: string, tenantId: string | null) {
    if (!tenantId) return [];
    await this.findProductOrThrow(productId, tenantId);
    return this.prisma.inventoryMovement.findMany({
      where: { productId },
      include: { branch: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async adjustStock(productId: string, tenantId: string | null, dto: AdjustStockDto, user: RequestUser) {
    if (!tenantId) throw new BadRequestException('Selecciona un tenant activo.');
    const product = await this.findProductOrThrow(productId, tenantId);
    this.assertTracksInventory(product);
    await this.assertBranchBelongsToTenant(dto.branchId, tenantId);

    await this.prisma.$transaction((tx) =>
      this.applyMovement(tx, {
        productId,
        branchId: dto.branchId,
        movementType: 'adjustment',
        quantity: dto.quantityDelta,
        unitCost: dto.unitCost,
        sourceType: 'manual_adjustment',
        notes: dto.notes,
        createdBy: user.userId,
      }),
    );

    return this.getStockByProduct(productId, tenantId);
  }

  async consume(productId: string, tenantId: string | null, dto: ConsumeStockDto, user: RequestUser) {
    if (!tenantId) throw new BadRequestException('Selecciona un tenant activo.');
    const product = await this.findProductOrThrow(productId, tenantId);
    this.assertTracksInventory(product);
    const branch = await this.assertBranchBelongsToTenant(dto.branchId, tenantId);

    if (!branch.defaultInventoryAccountId) {
      throw new BadRequestException(
        'La sucursal no tiene una cuenta de inventario configurada. Configúrala antes de continuar.',
      );
    }

    const expenseAccount = await this.prisma.account.findFirst({
      where: { id: dto.expenseAccountId, tenantId },
      include: { accountType: { select: { catalogCode: true, code: true } } },
    });
    if (!expenseAccount) {
      throw new BadRequestException('Esa cuenta no pertenece a este tenant.');
    }
    if (expenseAccount.accountType.catalogCode !== ACCOUNT_TYPE_CATALOG_CODE || expenseAccount.accountType.code !== 'EXPENSE') {
      throw new BadRequestException('La cuenta de consumo debe ser de tipo Gasto.');
    }

    const branchWithInstitution = await this.prisma.branch.findUniqueOrThrow({
      where: { id: dto.branchId },
      select: { institutionId: true },
    });
    // El consumo nunca cambia el costo promedio (solo un movimiento con
    // unitCost y cantidad positiva lo hace) — se lee ANTES de aplicar el
    // movimiento, aunque de todas formas no cambiaría.
    const costo = new Prisma.Decimal(dto.quantity).times(product.averageCost);

    await this.prisma.$transaction(async (tx) => {
      await this.applyMovement(tx, {
        productId,
        branchId: dto.branchId,
        movementType: 'internal_use',
        quantity: new Prisma.Decimal(dto.quantity).negated(),
        sourceType: 'internal_use',
        notes: dto.notes,
        createdBy: user.userId,
      });

      // Sin costo real que mover (producto todavía en costo promedio 0,
      // nunca entró por un ajuste con unitCost) no hay nada que contabilizar
      // — un asiento 0/0 sería puro ruido en el libro. Mismo criterio que
      // PeriodClosingsService: la existencia sí se descuenta arriba, el
      // asiento contable es lo único que se omite.
      if (!costo.isZero()) {
        await this.ledger.postEntry(tx, {
          tenantId,
          institutionId: branchWithInstitution.institutionId,
          branchId: dto.branchId,
          entryDate: new Date(),
          description: `Uso interno: ${product.name} — ${dto.notes}`,
          sourceType: 'internal_use',
          createdBy: user.userId,
          lines: [
            { accountId: dto.expenseAccountId, debitAmount: costo },
            { accountId: branch.defaultInventoryAccountId!, creditAmount: costo },
          ],
        });
      }
    });

    return this.getStockByProduct(productId, tenantId);
  }
}
