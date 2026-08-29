import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { LedgerService } from '../../finanzas/ledger/ledger.service';
import { InventoryService } from '../../inventario/inventory/inventory.service';
import { DocumentSequencesService } from '../../general/document-sequences/document-sequences.service';
import { resolveInstitutionScope, resolveBranchScope } from '../../../common/utils/institution-scope.util';
import { CreateSaleDto } from './dto/create-sale.dto';
import type { RequestUser } from '../../../common/decorators/current-user.decorator';

const include = {
  branch: { select: { id: true, name: true } },
  customer: { select: { id: true, name: true } },
  lines: {
    include: { product: { select: { id: true, name: true, sku: true } } },
  },
};

// Ventas a clientes (docs/comercio-mejoras-propuestas.md §5) — a diferencia
// de Purchase (registrar→Contabilizar en 2 pasos), una Venta nace atómica:
// encabezado + líneas + folio + movimiento de existencia + asiento contable,
// todo en la misma transacción de create(), porque ya se cobró en el
// momento. Sin editar/eliminar después — inmutable una vez creada.
@Injectable()
export class SalesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ledger: LedgerService,
    private readonly inventory: InventoryService,
    private readonly documentSequences: DocumentSequencesService,
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

  private async findSaleOrThrow(id: string, tenantId: string | null) {
    const sale = await this.prisma.sale.findFirst({ where: { id, ...(tenantId ? { tenantId } : {}) }, include });
    if (!sale) throw new NotFoundException(`Venta "${id}" no encontrada`);
    return sale;
  }

  private async assertSaleAccessible(sale: { institutionId: string; branchId: string }, user: RequestUser) {
    if (user.isSuperadmin) return;
    const institutionScope = await resolveInstitutionScope(this.prisma, user);
    if (!institutionScope.unrestricted && !institutionScope.institutionIds.includes(sale.institutionId)) {
      throw new NotFoundException('Venta no encontrada');
    }
    const branchScope = await resolveBranchScope(this.prisma, { ...user, institutionId: sale.institutionId });
    if (!branchScope.unrestricted && !branchScope.branchIds.includes(sale.branchId)) {
      throw new NotFoundException('Venta no encontrada');
    }
  }

  private async getAccessibleSale(id: string, tenantId: string | null, user: RequestUser) {
    const sale = await this.findSaleOrThrow(id, tenantId);
    await this.assertSaleAccessible(sale, user);
    return sale;
  }

  async findAll(institutionId: string, tenantId: string | null, user: RequestUser) {
    await this.assertInstitutionAccessible(institutionId, tenantId, user);
    const branchScope = await resolveBranchScope(this.prisma, { ...user, institutionId });

    return this.prisma.sale.findMany({
      where: {
        institutionId,
        ...(branchScope.unrestricted ? {} : { branchId: { in: branchScope.branchIds } }),
      },
      include,
      orderBy: { createdAt: 'desc' },
    });
  }

  findOne(id: string, tenantId: string | null, user: RequestUser) {
    return this.getAccessibleSale(id, tenantId, user);
  }

  async create(tenantId: string | null, dto: CreateSaleDto, user: RequestUser) {
    if (!tenantId) throw new BadRequestException('Selecciona un tenant activo.');
    const institution = await this.assertInstitutionAccessible(dto.institutionId, tenantId, user);
    const branch = await this.assertBranchBelongsToInstitution(dto.branchId, dto.institutionId);

    if (!user.isSuperadmin) {
      const branchScope = await resolveBranchScope(this.prisma, { ...user, institutionId: dto.institutionId });
      if (!branchScope.unrestricted && !branchScope.branchIds.includes(dto.branchId)) {
        throw new ForbiddenException('No tienes alcance para registrar una venta en esa sucursal.');
      }
    }

    if (dto.customerId) {
      const customer = await this.prisma.customer.findFirst({ where: { id: dto.customerId, tenantId } });
      if (!customer) throw new BadRequestException('Ese cliente no pertenece a este tenant.');
    }

    const products = await this.prisma.product.findMany({
      where: { id: { in: dto.lines.map((l) => l.productId) }, tenantId },
    });
    const productById = new Map(products.map((p) => [p.id, p]));
    for (const line of dto.lines) {
      if (!productById.has(line.productId)) {
        throw new BadRequestException(`Un producto de la venta no pertenece a este tenant.`);
      }
    }

    // Valida existencia suficiente de TODAS las líneas antes de mover
    // cualquiera — nunca una venta parcial.
    for (const line of dto.lines) {
      const product = productById.get(line.productId)!;
      if (!product.tracksInventory) continue;
      const stock = await this.prisma.productStock.findUnique({
        where: { uq_product_stocks_product_branch: { productId: line.productId, branchId: dto.branchId } },
      });
      const available = stock?.quantity ?? new Prisma.Decimal(0);
      if (available.lessThan(line.quantity)) {
        throw new BadRequestException(
          `Existencia insuficiente de "${product.name}" en esta sucursal (disponible: ${available}, pedido: ${line.quantity}).`,
        );
      }
    }

    if (!branch.defaultInventoryAccountId) {
      throw new BadRequestException('La sucursal no tiene una cuenta de inventario configurada. Configúrala antes de vender.');
    }
    if (!branch.defaultSalesAccountId) {
      throw new BadRequestException('La sucursal no tiene una cuenta de ventas configurada. Configúrala antes de vender.');
    }
    if (!branch.defaultCogsAccountId) {
      throw new BadRequestException('La sucursal no tiene una cuenta de costo de ventas configurada. Configúrala antes de vender.');
    }
    const cashOrReceivableAccountId =
      dto.paymentMethod === 'credit' ? branch.defaultReceivableAccountId : branch.defaultCashAccountId;
    if (!cashOrReceivableAccountId) {
      throw new BadRequestException(
        dto.paymentMethod === 'credit'
          ? 'La sucursal no tiene una cuenta de cuentas por cobrar configurada. Configúrala antes de vender.'
          : 'La sucursal no tiene una cuenta de caja configurada. Configúrala antes de vender.',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const documentNumber = await this.documentSequences.getNextDocumentNumber(tx, {
        tenantId,
        branchId: dto.branchId,
        documentTypeCode: dto.documentType === 'invoice' ? 'sale_invoice' : 'sale_receipt',
      });

      const sale = await tx.sale.create({
        data: {
          tenantId: institution.tenantId,
          institutionId: dto.institutionId,
          branchId: dto.branchId,
          customerId: dto.customerId,
          saleDate: new Date(dto.saleDate),
          paymentMethod: dto.paymentMethod,
          documentType: dto.documentType,
          documentNumber,
          notes: dto.notes,
          createdBy: user.userId,
        },
      });

      let totalPrice = new Prisma.Decimal(0);
      let totalCost = new Prisma.Decimal(0);

      for (const line of dto.lines) {
        const product = productById.get(line.productId)!;
        const unitCost = product.averageCost;

        await tx.saleLine.create({
          data: { saleId: sale.id, productId: line.productId, quantity: line.quantity, unitPrice: line.unitPrice, unitCost },
        });

        if (product.tracksInventory) {
          await this.inventory.applyMovement(tx, {
            productId: line.productId,
            branchId: dto.branchId,
            movementType: 'sale',
            quantity: new Prisma.Decimal(line.quantity).negated(),
            sourceType: 'sale',
            sourceId: sale.id,
            notes: `Venta ${documentNumber}`,
            createdBy: user.userId,
          });
        }

        totalPrice = totalPrice.plus(new Prisma.Decimal(line.quantity).times(line.unitPrice));
        totalCost = totalCost.plus(new Prisma.Decimal(line.quantity).times(unitCost));
      }

      const journalEntry = await this.ledger.postEntry(tx, {
        tenantId,
        institutionId: dto.institutionId,
        branchId: dto.branchId,
        entryDate: new Date(dto.saleDate),
        description: `Venta ${documentNumber}`,
        sourceType: 'sale',
        sourceId: sale.id,
        createdBy: user.userId,
        lines: [
          { accountId: cashOrReceivableAccountId, debitAmount: totalPrice },
          { accountId: branch.defaultSalesAccountId!, creditAmount: totalPrice },
          { accountId: branch.defaultCogsAccountId!, debitAmount: totalCost },
          { accountId: branch.defaultInventoryAccountId!, creditAmount: totalCost },
        ],
      });

      await tx.sale.update({ where: { id: sale.id }, data: { journalEntryId: journalEntry.id } });
      return tx.sale.findUniqueOrThrow({ where: { id: sale.id }, include });
    });
  }

  async getForPdf(id: string, tenantId: string | null, user: RequestUser) {
    const sale = await this.getAccessibleSale(id, tenantId, user);
    const institution = await this.prisma.institution.findUniqueOrThrow({ where: { id: sale.institutionId } });
    return { sale, institutionName: institution.name };
  }
}
