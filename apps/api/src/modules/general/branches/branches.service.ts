import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { CreateBranchDto } from './dto/create-branch.dto';
import { UpdateBranchDto } from './dto/update-branch.dto';
import { UpsertAddressDto } from './dto/upsert-address.dto';
import {
  resolveBranchScope,
  resolveAllBranchesScope,
} from '../../../common/utils/institution-scope.util';
import type { RequestUser } from '../../../common/decorators/current-user.decorator';

// El acceso a institución/sucursal (¿tiene el usuario alcance sobre ESTE
// recurso?) lo afirma ScopeGuard vía @RequireScope() en el controller antes
// de que estos métodos se ejecuten — ver branches.controller.ts,
// address.controller.ts, branches-all.controller.ts. Lo que queda aquí es
// solo lo que el guard no resuelve: construir el filtro de las listas
// (resolveBranchScope/resolveAllBranchesScope) y las reglas de negocio
// propias de cada operación.
@Injectable()
export class BranchesService {
  constructor(private readonly prisma: PrismaService) {}

  // Vista agregada: todas las sucursales del tenant (de todas sus
  // instituciones) con el nombre de su institución — usada por la pantalla
  // /general/branches, que antes no tenía ninguna vista propia y solo
  // redirigía a Instituciones.
  //
  // Ojo: NO alcanza con un scope de institución solo — un usuario con scope
  // de UNA sucursal puntual (ej. un "Pastor" asignado a una sede) tiene esa
  // institución dentro de su alcance, pero eso no significa que deba ver
  // las OTRAS sucursales de esa misma institución. Por eso se usa
  // resolveAllBranchesScope, que combina instituciones completas + sucursales
  // puntuales en un solo filtro.
  async findAllForTenant(tenantId: string | null, user: RequestUser) {
    const scope = await resolveAllBranchesScope(this.prisma, user);

    return this.prisma.branch.findMany({
      where: {
        ...(tenantId ? { institution: { tenantId } } : {}),
        ...(scope.unrestricted
          ? {}
          : {
              OR: [
                { institutionId: { in: scope.wholeInstitutionIds } },
                { id: { in: scope.branchIds } },
              ],
            }),
      },
      include: { institution: { select: { id: true, name: true } } },
      orderBy: [{ institution: { name: 'asc' } }, { name: 'asc' }],
    });
  }

  // Usada por la página de detalle de sucursal (/general/branches/:branchId)
  // — el acceso ya lo afirmó ScopeGuard en el controller.
  async findOneForTenant(branchId: string) {
    return this.prisma.branch.findUnique({
      where: { id: branchId },
      include: { institution: { select: { id: true, name: true } } },
    });
  }

  async findAll(institutionId: string, tenantId: string | null, user: RequestUser) {
    const branchScope = await resolveBranchScope(this.prisma, { ...user, institutionId });

    // No se filtra por isActive — una sucursal desactivada debe seguir
    // visible (con su badge en "Inactiva") para poder reactivarla.
    return this.prisma.branch.findMany({
      where: {
        institutionId,
        ...(tenantId ? { institution: { tenantId } } : {}),
        ...(branchScope.unrestricted ? {} : { id: { in: branchScope.branchIds } }),
      },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string, institutionId: string, tenantId: string | null, user: RequestUser) {
    const branchScope = await resolveBranchScope(this.prisma, { ...user, institutionId });

    const branch = await this.prisma.branch.findFirst({
      where: {
        id,
        institutionId,
        ...(tenantId ? { institution: { tenantId } } : {}),
        ...(branchScope.unrestricted ? {} : { id: { in: branchScope.branchIds } }),
      },
    });

    if (!branch) {
      throw new NotFoundException(`Sucursal "${id}" no encontrada`);
    }

    return branch;
  }

  async create(
    institutionId: string,
    tenantId: string | null,
    dto: CreateBranchDto,
  ) {
    const institution = await this.prisma.institution.findFirst({
      where: { id: institutionId, ...(tenantId ? { tenantId } : {}) },
    });

    if (!institution) {
      throw new NotFoundException(`Institución "${institutionId}" no encontrada`);
    }

    return this.prisma.branch.create({
      data: { ...dto, institutionId },
    });
  }

  async update(
    id: string,
    institutionId: string,
    tenantId: string | null,
    dto: UpdateBranchDto,
    user: RequestUser,
  ) {
    await this.findOne(id, institutionId, tenantId, user);
    return this.prisma.branch.update({ where: { id }, data: dto });
  }

  // Una sucursal tiene una única dirección "primaria" en esta versión —
  // Address soporta varias por fila (isPrimary), pero no hay UI todavía para
  // más de una, así que el upsert siempre opera sobre esa.
  async getAddress(branchId: string) {
    return this.prisma.address.findFirst({
      where: { branchId, isPrimary: true },
    });
  }

  async upsertAddress(branchId: string, dto: UpsertAddressDto) {
    const country = await this.prisma.country.findUnique({ where: { code: dto.countryCode } });
    if (!country) {
      throw new BadRequestException(`El país "${dto.countryCode}" no existe en el catálogo.`);
    }

    const existing = await this.prisma.address.findFirst({
      where: { branchId, isPrimary: true },
    });

    if (existing) {
      return this.prisma.address.update({ where: { id: existing.id }, data: dto });
    }

    return this.prisma.address.create({ data: { ...dto, branchId, isPrimary: true } });
  }
}
