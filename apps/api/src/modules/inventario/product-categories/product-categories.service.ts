import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { CreateProductCategoryDto } from './dto/create-product-category.dto';
import { UpdateProductCategoryDto } from './dto/update-product-category.dto';

// Catálogo plano de categorías, propio del tenant — mismo patrón que
// membresia.FundType. Nunca se borra, se desactiva (isActive=false).
@Injectable()
export class ProductCategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(tenantId: string | null) {
    if (!tenantId) return [];
    return this.prisma.productCategory.findMany({ where: { tenantId }, orderBy: { name: 'asc' } });
  }

  async create(tenantId: string | null, dto: CreateProductCategoryDto) {
    if (!tenantId) {
      throw new BadRequestException('Como superadmin, indica ?tenantId=<uuid> para especificar a qué tenant pertenece la categoría.');
    }

    const exists = await this.prisma.productCategory.findFirst({ where: { tenantId, name: dto.name } });
    if (exists) throw new ConflictException(`Ya existe una categoría "${dto.name}" en este tenant.`);

    return this.prisma.productCategory.create({ data: { tenantId, name: dto.name } });
  }

  async update(id: string, tenantId: string | null, dto: UpdateProductCategoryDto) {
    const category = await this.prisma.productCategory.findFirst({ where: { id, ...(tenantId ? { tenantId } : {}) } });
    if (!category) throw new NotFoundException(`Categoría "${id}" no encontrada`);

    return this.prisma.productCategory.update({
      where: { id },
      data: { name: dto.name, isActive: dto.isActive },
    });
  }
}
