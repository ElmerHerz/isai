import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';

// Clientes (docs/comercio-mejoras-propuestas.md §5) — tenant-wide, mismo
// criterio que Supplier: un mismo cliente sirve a todas las sucursales.
@Injectable()
export class CustomersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(tenantId: string | null) {
    if (!tenantId) return [];
    return this.prisma.customer.findMany({ where: { tenantId }, orderBy: { name: 'asc' } });
  }

  async findOne(id: string, tenantId: string | null) {
    const customer = await this.prisma.customer.findFirst({ where: { id, ...(tenantId ? { tenantId } : {}) } });
    if (!customer) throw new NotFoundException(`Cliente "${id}" no encontrado`);
    return customer;
  }

  async create(tenantId: string | null, dto: CreateCustomerDto) {
    if (!tenantId) {
      throw new BadRequestException('Como superadmin, indica ?tenantId=<uuid> para especificar a qué tenant pertenece el cliente.');
    }
    return this.prisma.customer.create({
      data: {
        tenantId,
        name: dto.name,
        taxId: dto.taxId,
        phone: dto.phone,
        email: dto.email,
        notes: dto.notes,
      },
    });
  }

  async update(id: string, tenantId: string | null, dto: UpdateCustomerDto) {
    await this.findOne(id, tenantId);
    return this.prisma.customer.update({
      where: { id },
      data: {
        name: dto.name,
        taxId: dto.taxId,
        phone: dto.phone,
        email: dto.email,
        notes: dto.notes,
        isActive: dto.isActive,
      },
    });
  }
}
