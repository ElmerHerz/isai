import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { CreateGroupPositionDto } from './dto/create-group-position.dto';
import { UpdateGroupPositionDto } from './dto/update-group-position.dto';
import { resolveInstitutionScope, resolveBranchScope } from '../../../common/utils/institution-scope.util';
import { ensureGroupMember } from '../groups/ensure-group-member.util';
import type { RequestUser } from '../../../common/decorators/current-user.decorator';

const include = {
  group: { select: { id: true, name: true, institutionId: true, branchId: true } },
  person: { select: { id: true, firstName: true, lastName: true } },
  position: { select: { id: true, code: true, name: true } },
};

// Mismo criterio que groups.service.ts: rutas planas, scope chequeado
// inline, sin @RequireScope(). No hay "delete" — un cargo se cierra con
// termEnd (igual que group_members se cierra con leftAt), nunca se borra.
@Injectable()
export class PositionsService {
  constructor(private readonly prisma: PrismaService) {}

  private async assertGroupAccessible(groupId: string, tenantId: string | null, user: RequestUser) {
    const group = await this.prisma.group.findFirst({
      where: { id: groupId, ...(tenantId ? { institution: { tenantId } } : {}) },
    });
    if (!group) throw new BadRequestException(`Grupo "${groupId}" no encontrado`);

    if (!user.isSuperadmin) {
      const institutionScope = await resolveInstitutionScope(this.prisma, user);
      if (!institutionScope.unrestricted && !institutionScope.institutionIds.includes(group.institutionId)) {
        throw new ForbiddenException('No tienes alcance sobre ese grupo.');
      }

      if (group.branchId) {
        const branchScope = await resolveBranchScope(this.prisma, { ...user, institutionId: group.institutionId });
        if (!branchScope.unrestricted && !branchScope.branchIds.includes(group.branchId)) {
          throw new ForbiddenException('No tienes alcance sobre ese grupo.');
        }
      }
    }

    return group;
  }

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

  async findAll(institutionId: string, tenantId: string | null, user: RequestUser, groupId?: string) {
    await this.assertInstitutionAccessible(institutionId, tenantId, user);

    const branchScope = await resolveBranchScope(this.prisma, { ...user, institutionId });

    return this.prisma.groupPosition.findMany({
      where: {
        group: {
          institutionId,
          ...(groupId ? { id: groupId } : {}),
          ...(branchScope.unrestricted
            ? {}
            : { OR: [{ branchId: null }, { branchId: { in: branchScope.branchIds } }] }),
        },
      },
      include,
      orderBy: [{ termStart: 'desc' }],
    });
  }

  async create(tenantId: string | null, dto: CreateGroupPositionDto, user: RequestUser) {
    const group = await this.assertGroupAccessible(dto.groupId, tenantId, user);

    const person = await this.prisma.person.findFirst({
      where: { id: dto.personId, institutionId: group.institutionId, deletedAt: null },
    });
    if (!person) throw new BadRequestException('La persona no pertenece a la institución de este grupo.');

    const created = await this.prisma.groupPosition.create({
      data: {
        groupId: dto.groupId,
        personId: dto.personId,
        positionId: dto.positionId,
        // termStart no tiene default en el schema (a diferencia de
        // group_members.joinedAt) — "vacío = hoy" se resuelve aquí.
        termStart: dto.termStart ? new Date(dto.termStart) : new Date(),
        termEnd: dto.termEnd ? new Date(dto.termEnd) : undefined,
      },
      include,
    });

    await ensureGroupMember(this.prisma, dto.groupId, dto.personId);

    return created;
  }

  private async findOrThrow(id: string, tenantId: string | null) {
    const position = await this.prisma.groupPosition.findFirst({
      where: { id, ...(tenantId ? { group: { institution: { tenantId } } } : {}) },
      include,
    });
    if (!position) throw new NotFoundException(`Cargo "${id}" no encontrado`);
    return position;
  }

  async update(id: string, tenantId: string | null, dto: UpdateGroupPositionDto, user: RequestUser) {
    const existing = await this.findOrThrow(id, tenantId);
    await this.assertGroupAccessible(dto.groupId ?? existing.groupId, tenantId, user);

    if (dto.personId) {
      const person = await this.prisma.person.findFirst({
        where: { id: dto.personId, institutionId: existing.group.institutionId, deletedAt: null },
      });
      if (!person) throw new BadRequestException('La persona no pertenece a la institución de este grupo.');
    }

    const updated = await this.prisma.groupPosition.update({
      where: { id },
      data: {
        groupId: dto.groupId,
        personId: dto.personId,
        positionId: dto.positionId,
        termStart: dto.termStart ? new Date(dto.termStart) : undefined,
        termEnd: dto.termEnd ? new Date(dto.termEnd) : undefined,
      },
      include,
    });

    // Cubre tanto reasignar el cargo a otra persona como moverlo a otro
    // grupo — en ambos casos el resultado final (updated.groupId/personId)
    // debe reflejarse en group_members, no solo el caso "todo nuevo".
    if (dto.personId || dto.groupId) {
      await ensureGroupMember(this.prisma, updated.groupId, updated.personId);
    }

    return updated;
  }
}
