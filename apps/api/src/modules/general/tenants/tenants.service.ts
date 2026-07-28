import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';

/**
 * Regla: El service contiene TODA la lógica de negocio.
 * No accede a req/res de HTTP — solo recibe datos puros.
 * Toda query a BD pasa por PrismaService.
 */
@Injectable()
export class TenantsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.tenant.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id },
      include: {
        institutions: { where: { isActive: true } },
        // tenant_modules no tiene columna "activo" — un módulo sigue vigente
        // mientras no tenga expiresAt, o su expiresAt todavía no haya pasado.
        tenantModules: {
          where: { OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] },
          include: { module: true },
        },
      },
    });

    if (!tenant) {
      throw new NotFoundException(`Tenant con id "${id}" no encontrado`);
    }

    return tenant;
  }

  async create(dto: CreateTenantDto) {
    const exists = await this.prisma.tenant.findUnique({
      where: { slug: dto.slug },
    });

    if (exists) {
      throw new ConflictException(`Ya existe un tenant con slug "${dto.slug}"`);
    }

    return this.prisma.tenant.create({ data: dto });
  }

  async update(id: string, dto: UpdateTenantDto) {
    await this.findOne(id); // Lanza NotFoundException si no existe

    return this.prisma.tenant.update({
      where: { id },
      data: dto,
    });
  }
}
