import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { CreateInstitutionDto } from './dto/create-institution.dto';
import { UpdateInstitutionDto } from './dto/update-institution.dto';
import { resolveInstitutionScope } from '../../../common/utils/institution-scope.util';
import type { RequestUser } from '../../../common/decorators/current-user.decorator';

@Injectable()
export class InstitutionsService {
  constructor(private readonly prisma: PrismaService) {}

  // tenantId === null → superadmin sin tenant seleccionado: ve todos los tenants.
  // El scope de user_roles restringe además a las instituciones concretas que
  // el usuario tiene asignadas (a menos que tenga un rol de todo el tenant).
  // No se filtra por isActive — una institución desactivada debe seguir
  // visible (con su badge en "Inactiva") para poder reactivarla, no
  // desaparecer sin forma de volver atrás desde la UI.
  async findAll(tenantId: string | null, user: RequestUser) {
    const scope = await resolveInstitutionScope(this.prisma, user);

    const institutions = await this.prisma.institution.findMany({
      where: {
        ...(tenantId ? { tenantId } : {}),
        ...(scope.unrestricted ? {} : { id: { in: scope.institutionIds } }),
      },
      orderBy: { name: 'asc' },
    });

    const counts = await this.prisma.branch.groupBy({
      by: ['institutionId'],
      where: { institutionId: { in: institutions.map((i) => i.id) } },
      _count: { _all: true },
    });
    const branchCountById = new Map(counts.map((c) => [c.institutionId, c._count._all]));

    return institutions.map((i) => ({
      ...i,
      branchCount: branchCountById.get(i.id) ?? 0,
    }));
  }

  async findOne(id: string, tenantId: string | null, user: RequestUser) {
    const scope = await resolveInstitutionScope(this.prisma, user);

    const institution = await this.prisma.institution.findFirst({
      where: {
        id,
        ...(tenantId ? { tenantId } : {}),
        ...(scope.unrestricted ? {} : { id: { in: scope.institutionIds } }),
      },
      include: { branches: true },
    });

    // 404, nunca 403 — no filtrar si existe fuera del scope del usuario.
    if (!institution) {
      throw new NotFoundException(`Institución "${id}" no encontrada`);
    }

    return institution;
  }

  async create(tenantId: string | null, dto: CreateInstitutionDto) {
    if (!tenantId) {
      throw new BadRequestException(
        'Como superadmin, indica ?tenantId=<uuid> para especificar a qué tenant pertenece la institución.',
      );
    }

    return this.prisma.institution.create({
      data: { ...dto, tenantId },
    });
  }

  async update(id: string, tenantId: string | null, dto: UpdateInstitutionDto, user: RequestUser) {
    await this.findOne(id, tenantId, user);
    return this.prisma.institution.update({ where: { id }, data: dto });
  }
}
