import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { LedgerService } from '../../finanzas/ledger/ledger.service';
import { InventoryService } from '../../inventario/inventory/inventory.service';
import { resolveInstitutionScope, resolveBranchScope } from '../../../common/utils/institution-scope.util';
import { CreatePurchaseDto } from './dto/create-purchase.dto';
import { AddPurchaseLineDto } from './dto/add-purchase-line.dto';
import type { RequestUser } from '../../../common/decorators/current-user.decorator';

const include = {
  branch: { select: { id: true, name: true } },
  supplier: { select: { id: true, name: true } },
  lines: {
    include: { product: { select: { id: true, name: true, sku: true } } },
  },
};

// Compras a proveedores (docs/comercio-mejoras-propuestas.md §4) — mismo
// patrón registrar→Contabilizar de 2 pasos que Gastos de Proyecto/Fondo de
// Grupo, y mismo esqueleto de institución/sucursal que BudgetsService.
@Injectable()
export class PurchasesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ledger: LedgerService,
    private readonly inventory: InventoryService,
  ) {}

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
    return branch;
  }

  private async findPurchaseOrThrow(id: string, tenantId: string | null) {
    const purchase = await this.prisma.purchase.findFirst({ where: { id, ...(tenantId ? { tenantId } : {}) }, include });
    if (!purchase) throw new NotFoundException(`Compra "${id}" no encontrada`);
    return purchase;
  }

  private async assertPurchaseAccessible(purchase: { institutionId: string; branchId: string }, user: RequestUser) {
    if (user.isSuperadmin) return;
    const institutionScope = await resolveInstitutionScope(this.prisma, user);
    if (!institutionScope.unrestricted && !institutionScope.institutionIds.includes(purchase.institutionId)) {
      throw new NotFoundException('Compra no encontrada');
    }
    const branchScope = await resolveBranchScope(this.prisma, { ...user, institutionId: purchase.institutionId });
    if (!branchScope.unrestricted && !branchScope.branchIds.includes(purchase.branchId)) {
      throw new NotFoundException('Compra no encontrada');
    }
  }

  private async getAccessiblePurchase(id: string, tenantId: string | null, user: RequestUser) {
    const purchase = await this.findPurchaseOrThrow(id, tenantId);
    await this.assertPurchaseAccessible(purchase, user);
    return purchase;
  }

  async findAll(institutionId: string, tenantId: string | null, user: RequestUser) {
    await this.assertInstitutionAccessible(institutionId, tenantId, user);
    const branchScope = await resolveBranchScope(this.prisma, { ...user, institutionId });

    return this.prisma.purchase.findMany({
      where: {
        institutionId,
        ...(branchScope.unrestricted ? {} : { branchId: { in: branchScope.branchIds } }),
      },
      include,
      orderBy: { purchaseDate: 'desc' },
    });
  }

  findOne(id: string, tenantId: string | null, user: RequestUser) {
    return this.getAccessiblePurchase(id, tenantId, user);
  }

  async create(tenantId: string | null, dto: CreatePurchaseDto, user: RequestUser) {
    if (!tenantId) throw new BadRequestException('Selecciona un tenant activo.');
    const institution = await this.assertInstitutionAccessible(dto.institutionId, tenantId, user);
    await this.assertBranchBelongsToInstitution(dto.branchId, dto.institutionId);

    if (!user.isSuperadmin) {
      const branchScope = await resolveBranchScope(this.prisma, { ...user, institutionId: dto.institutionId });
      if (!branchScope.unrestricted && !branchScope.branchIds.includes(dto.branchId)) {
        throw new ForbiddenException('No tienes alcance para registrar una compra en esa sucursal.');
      }
    }

    const supplier = await this.prisma.supplier.findFirst({ where: { id: dto.supplierId, tenantId } });
    if (!supplier) throw new BadRequestException('Ese proveedor no pertenece a este tenant.');

    return this.prisma.purchase.create({
      data: {
        tenantId: institution.tenantId,
        institutionId: dto.institutionId,
        branchId: dto.branchId,
        supplierId: dto.supplierId,
        purchaseDate: new Date(dto.purchaseDate),
        supplierDocumentNumber: dto.supplierDocumentNumber,
        paymentMethod: dto.paymentMethod,
        notes: dto.notes,
        createdBy: user.userId,
      },
      include,
    });
  }

  async addLine(purchaseId: string, tenantId: string | null, dto: AddPurchaseLineDto, user: RequestUser) {
    const purchase = await this.getAccessiblePurchase(purchaseId, tenantId, user);
    if (purchase.journalEntryId) {
      throw new BadRequestException('Esta compra ya fue contabilizada — no se pueden agregar más líneas.');
    }

    const product = await this.prisma.product.findFirst({ where: { id: dto.productId, tenantId: purchase.tenantId } });
    if (!product) throw new BadRequestException('Ese producto no pertenece a este tenant.');
    if (!product.tracksInventory) {
      throw new BadRequestException('Este producto no lleva control de existencia — no se puede comprar por este medio.');
    }

    await this.prisma.purchaseLine.create({
      data: { purchaseId, productId: dto.productId, quantity: dto.quantity, unitCost: dto.unitCost },
    });

    return this.findPurchaseOrThrow(purchaseId, tenantId);
  }

  async removeLine(purchaseId: string, lineId: string, tenantId: string | null, user: RequestUser) {
    const purchase = await this.getAccessiblePurchase(purchaseId, tenantId, user);
    if (purchase.journalEntryId) {
      throw new BadRequestException('Esta compra ya fue contabilizada — no se pueden quitar líneas.');
    }

    const line = await this.prisma.purchaseLine.findFirst({ where: { id: lineId, purchaseId } });
    if (!line) throw new NotFoundException(`Línea "${lineId}" no encontrada`);

    await this.prisma.purchaseLine.delete({ where: { id: lineId } });
    return this.findPurchaseOrThrow(purchaseId, tenantId);
  }

  async postToLedger(id: string, tenantId: string | null, user: RequestUser) {
    const purchase = await this.getAccessiblePurchase(id, tenantId, user);
    if (purchase.journalEntryId) {
      throw new BadRequestException('Esta compra ya fue contabilizada.');
    }
    if (purchase.lines.length === 0) {
      throw new BadRequestException('Agrega al menos una línea antes de contabilizar.');
    }

    const branch = await this.prisma.branch.findUniqueOrThrow({ where: { id: purchase.branchId } });
    if (!branch.defaultInventoryAccountId) {
      throw new BadRequestException(
        'La sucursal de esta compra no tiene una cuenta de inventario configurada. Configúrala antes de contabilizar.',
      );
    }
    const creditAccountId = purchase.paymentMethod === 'credit' ? branch.defaultPayableAccountId : branch.defaultCashAccountId;
    if (!creditAccountId) {
      throw new BadRequestException(
        purchase.paymentMethod === 'credit'
          ? 'La sucursal de esta compra no tiene una cuenta de cuentas por pagar configurada. Configúrala antes de contabilizar.'
          : 'La sucursal de esta compra no tiene una cuenta de caja configurada. Configúrala antes de contabilizar.',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      let total = new Prisma.Decimal(0);
      for (const line of purchase.lines) {
        await this.inventory.applyMovement(tx, {
          productId: line.productId,
          branchId: purchase.branchId,
          movementType: 'purchase',
          quantity: line.quantity,
          unitCost: line.unitCost,
          sourceType: 'purchase',
          sourceId: purchase.id,
          notes: `Compra a ${purchase.supplier.name}`,
          createdBy: user.userId,
        });
        total = total.plus(new Prisma.Decimal(line.quantity).times(line.unitCost));
      }

      const journalEntry = await this.ledger.postEntry(tx, {
        tenantId: purchase.tenantId,
        institutionId: purchase.institutionId,
        branchId: purchase.branchId,
        entryDate: purchase.purchaseDate,
        description: `Compra a ${purchase.supplier.name}`,
        sourceType: 'purchase',
        sourceId: purchase.id,
        createdBy: user.userId,
        lines: [
          { accountId: branch.defaultInventoryAccountId!, debitAmount: total },
          { accountId: creditAccountId, creditAmount: total },
        ],
      });

      return tx.purchase.update({ where: { id }, data: { journalEntryId: journalEntry.id }, include });
    });
  }

  async remove(id: string, tenantId: string | null, user: RequestUser) {
    const purchase = await this.getAccessiblePurchase(id, tenantId, user);
    if (purchase.journalEntryId) {
      throw new BadRequestException('Esta compra ya fue contabilizada — no se puede eliminar.');
    }
    await this.prisma.purchase.delete({ where: { id } });
  }
}
