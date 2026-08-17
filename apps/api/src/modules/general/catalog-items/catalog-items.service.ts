import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { CreateCatalogItemDto } from './dto/create-catalog-item.dto';
import { UpdateCatalogItemDto } from './dto/update-catalog-item.dto';

@Injectable()
export class CatalogItemsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(catalogCode?: string) {
    return this.prisma.catalogItem.findMany({
      where: catalogCode ? { catalogCode } : {},
      orderBy: [{ catalogCode: 'asc' }, { sortOrder: 'asc' }, { name: 'asc' }],
    });
  }

  async create(dto: CreateCatalogItemDto) {
    const exists = await this.prisma.catalogItem.findUnique({
      where: { uq_catalog_items_code: { catalogCode: dto.catalogCode, code: dto.code } },
    });
    if (exists) {
      throw new ConflictException(
        `Ya existe un ítem con código "${dto.code}" en el catálogo "${dto.catalogCode}"`,
      );
    }

    return this.prisma.catalogItem.create({ data: dto });
  }

  async update(id: string, dto: UpdateCatalogItemDto) {
    const item = await this.prisma.catalogItem.findUnique({ where: { id } });
    if (!item) throw new NotFoundException(`Ítem de catálogo "${id}" no encontrado`);

    return this.prisma.catalogItem.update({ where: { id }, data: dto });
  }
}
