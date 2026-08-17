import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import { UpdateTenantSettingsDto } from './dto/update-tenant-settings.dto';

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

    // Sin esto el tenant queda con tenant_modules vacío y MenusService.findMyMenu
    // filtra TODO el árbol de menú a nada (moduleCode IN () no matchea ninguna
    // fila) — cualquier usuario no-superadmin del tenant ve el sidebar vacío.
    return this.prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({ data: dto });

      const coreModules = await tx.module.findMany({
        where: { isCore: true },
        select: { code: true },
      });

      if (coreModules.length > 0) {
        await tx.tenantModule.createMany({
          data: coreModules.map((m) => ({ tenantId: tenant.id, moduleCode: m.code })),
        });
      }

      return tenant;
    });
  }

  async update(id: string, dto: UpdateTenantDto) {
    await this.findOne(id); // Lanza NotFoundException si no existe

    return this.prisma.tenant.update({
      where: { id },
      data: dto,
    });
  }

  // Self-service: lo que puede leer/tocar un Administrador de SU PROPIO
  // tenant (moneda/país/idioma), a diferencia de findOne/update que son de
  // uso superadmin sobre cualquier tenant por id.
  async getSelfSettings(tenantId: string) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) throw new NotFoundException(`Tenant "${tenantId}" no encontrado`);
    return tenant;
  }

  async updateSelfSettings(tenantId: string, dto: UpdateTenantSettingsDto) {
    await this.getSelfSettings(tenantId); // Lanza NotFoundException si no existe

    if (dto.currencyCode) {
      const currency = await this.prisma.currency.findUnique({ where: { code: dto.currencyCode } });
      if (!currency) throw new BadRequestException(`La moneda "${dto.currencyCode}" no existe en el catálogo.`);
    }
    if (dto.countryCode) {
      const country = await this.prisma.country.findUnique({ where: { code: dto.countryCode } });
      if (!country) throw new BadRequestException(`El país "${dto.countryCode}" no existe en el catálogo.`);
    }
    if (dto.languageCode) {
      const language = await this.prisma.language.findUnique({ where: { code: dto.languageCode } });
      if (!language) throw new BadRequestException(`El idioma "${dto.languageCode}" no existe en el catálogo.`);
    }

    return this.prisma.tenant.update({ where: { id: tenantId }, data: dto });
  }
}
