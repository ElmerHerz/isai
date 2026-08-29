import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';

// Proveedores (docs/comercio-mejoras-propuestas.md §4) — tenant-wide, mismo
// criterio que Product: un mismo proveedor sirve a todas las sucursales.
@Injectable()
export class SuppliersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(tenantId: string | null) {
    if (!tenantId) return [];
    return this.prisma.supplier.findMany({ where: { tenantId }, orderBy: { name: 'asc' } });
  }

  async findOne(id: string, tenantId: string | null) {
    const supplier = await this.prisma.supplier.findFirst({ where: { id, ...(tenantId ? { tenantId } : {}) } });
    if (!supplier) throw new NotFoundException(`Proveedor "${id}" no encontrado`);
    return supplier;
  }

  async create(tenantId: string | null, dto: CreateSupplierDto) {
    if (!tenantId) {
      throw new BadRequestException('Como superadmin, indica ?tenantId=<uuid> para especificar a qué tenant pertenece el proveedor.');
    }
    return this.prisma.supplier.create({
      data: {
        tenantId,
        name: dto.name,
        taxId: dto.taxId,
        phone: dto.phone,
        email: dto.email,
        address: dto.address,
        notes: dto.notes,
      },
    });
  }

  async update(id: string, tenantId: string | null, dto: UpdateSupplierDto) {
    await this.findOne(id, tenantId);
    return this.prisma.supplier.update({
      where: { id },
      data: {
        name: dto.name,
        taxId: dto.taxId,
        phone: dto.phone,
        email: dto.email,
        address: dto.address,
        notes: dto.notes,
        isActive: dto.isActive,
      },
    });
  }
}
