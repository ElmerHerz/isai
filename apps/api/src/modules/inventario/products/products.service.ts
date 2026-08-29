import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { CreateProductUnitDto } from './dto/create-product-unit.dto';

const include = {
  category: { select: { id: true, name: true } },
  units: { orderBy: { createdAt: 'asc' as const } },
};

// Catálogo de productos (docs/comercio-mejoras-propuestas.md §2) — Product es
// de tenant, no de institución/sucursal, mismo criterio que finanzas.Account:
// un mismo catálogo para todas las sucursales, lo que varía por sucursal es
// la existencia (ProductStock, próxima rebanada).
@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  private async assertCategoryBelongsToTenant(categoryId: string, tenantId: string) {
    const category = await this.prisma.productCategory.findFirst({ where: { id: categoryId, tenantId } });
    if (!category) {
      throw new BadRequestException('Esa categoría no pertenece a este tenant.');
    }
  }

  async findAll(tenantId: string | null) {
    if (!tenantId) return [];
    return this.prisma.product.findMany({ where: { tenantId }, include, orderBy: { name: 'asc' } });
  }

  async findOne(id: string, tenantId: string | null) {
    const product = await this.prisma.product.findFirst({ where: { id, ...(tenantId ? { tenantId } : {}) }, include });
    if (!product) throw new NotFoundException(`Producto "${id}" no encontrado`);
    return product;
  }

  async findByBarcode(barcode: string, tenantId: string | null) {
    if (!tenantId) return null;
    return this.prisma.product.findFirst({ where: { tenantId, barcode }, include });
  }

  async create(tenantId: string | null, dto: CreateProductDto) {
    if (!tenantId) {
      throw new BadRequestException('Como superadmin, indica ?tenantId=<uuid> para especificar a qué tenant pertenece el producto.');
    }
    if (dto.categoryId) {
      await this.assertCategoryBelongsToTenant(dto.categoryId, tenantId);
    }

    if (dto.sku) {
      const exists = await this.prisma.product.findFirst({ where: { tenantId, sku: dto.sku } });
      if (exists) throw new ConflictException(`Ya existe un producto con SKU "${dto.sku}" en este tenant.`);
    }
    if (dto.barcode) {
      const exists = await this.prisma.product.findFirst({ where: { tenantId, barcode: dto.barcode } });
      if (exists) throw new ConflictException(`Ya existe un producto con código de barras "${dto.barcode}" en este tenant.`);
    }

    return this.prisma.product.create({
      data: {
        tenantId,
        sku: dto.sku,
        barcode: dto.barcode,
        name: dto.name,
        description: dto.description,
        categoryId: dto.categoryId,
        unitCode: dto.unitCode,
        salePrice: dto.salePrice,
        tracksInventory: dto.tracksInventory ?? true,
      },
      include,
    });
  }

  async update(id: string, tenantId: string | null, dto: UpdateProductDto) {
    const product = await this.findOne(id, tenantId);
    if (dto.categoryId) {
      await this.assertCategoryBelongsToTenant(dto.categoryId, product.tenantId);
    }

    return this.prisma.product.update({
      where: { id },
      data: {
        sku: dto.sku,
        barcode: dto.barcode,
        name: dto.name,
        description: dto.description,
        categoryId: dto.categoryId,
        unitCode: dto.unitCode,
        salePrice: dto.salePrice,
        tracksInventory: dto.tracksInventory,
        isActive: dto.isActive,
      },
      include,
    });
  }

  // Presentaciones adicionales (Caja, Fardo...) — se agregan/quitan una a la
  // vez, sin edición, mismo criterio que PurchaseLine/BudgetLine.
  async addUnit(productId: string, tenantId: string | null, dto: CreateProductUnitDto) {
    const product = await this.findOne(productId, tenantId);
    if (dto.unitCode === product.unitCode) {
      throw new BadRequestException('Esa presentación es la misma que la unidad base del producto.');
    }
    const exists = await this.prisma.productUnit.findFirst({ where: { productId, unitCode: dto.unitCode } });
    if (exists) {
      throw new ConflictException(`Ya existe una presentación "${dto.unitCode}" para este producto.`);
    }

    await this.prisma.productUnit.create({
      data: {
        productId,
        unitCode: dto.unitCode,
        conversionToBase: dto.conversionToBase,
        salePrice: dto.salePrice,
      },
    });
    return this.findOne(productId, tenantId);
  }

  async removeUnit(productId: string, unitId: string, tenantId: string | null) {
    await this.findOne(productId, tenantId);
    const unit = await this.prisma.productUnit.findFirst({ where: { id: unitId, productId } });
    if (!unit) throw new NotFoundException(`Presentación "${unitId}" no encontrada`);

    await this.prisma.productUnit.delete({ where: { id: unitId } });
    return this.findOne(productId, tenantId);
  }
}
