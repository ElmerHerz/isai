import { Injectable, NotFoundException, BadRequestException, ForbiddenException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { CreateGroupDto } from './dto/create-group.dto';
import { UpdateGroupDto } from './dto/update-group.dto';
import { AddGroupMemberDto } from './dto/add-group-member.dto';
import { resolveInstitutionScope, resolveBranchScope } from '../../../common/utils/institution-scope.util';
import { ensureGroupMember } from './ensure-group-member.util';
import type { RequestUser } from '../../../common/decorators/current-user.decorator';

// Mismo criterio que persons.service.ts: rutas planas, scope chequeado
// inline (no @RequireScope()), mismo patrón que institutions.service.ts.
@Injectable()
export class GroupsService {
  constructor(private readonly prisma: PrismaService) {}

  private async assertInstitutionAccessible(
    institutionId: string,
    tenantId: string | null,
    user: RequestUser,
  ) {
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

  // Además de validar que la sucursal pertenezca a la institución, valida
  // que quien escribe tenga alcance sobre ESA sucursal — mismo fix que
  // persons.service.ts, ver ahí el comentario completo (hallazgo de
  // auditoría de sesión).
  private async assertBranchBelongsToInstitution(
    branchId: string,
    institutionId: string,
    user: RequestUser,
  ) {
    const branch = await this.prisma.branch.findFirst({ where: { id: branchId, institutionId } });
    if (!branch) {
      throw new BadRequestException('La sucursal no pertenece a la institución indicada.');
    }

    if (!user.isSuperadmin) {
      const branchScope = await resolveBranchScope(this.prisma, { ...user, institutionId });
      if (!branchScope.unrestricted && !branchScope.branchIds.includes(branchId)) {
        throw new ForbiddenException('No tienes alcance sobre esa sucursal.');
      }
    }
  }

  // Nunca confiar en que el <Select> del frontend ya filtró por tenant —
  // mismo criterio reforzado en la auditoría de sesión (ver
  // ProjectsService.assertAccountBelongsToTenant). Además valida que sea de
  // tipo Activo y transaccionable: el fondo de un grupo necesita una cuenta
  // real de "dónde vive el dinero", no una de agrupación ni de otro tipo.
  private async assertCashAccountValid(cashAccountId: string, tenantId: string) {
    const account = await this.prisma.account.findFirst({
      where: { id: cashAccountId, tenantId },
      include: { accountType: { select: { code: true } } },
    });
    if (!account) {
      throw new BadRequestException('Esa cuenta no pertenece a este tenant.');
    }
    if (account.accountType.code !== 'ASSET') {
      throw new BadRequestException('La cuenta de caja del grupo debe ser de tipo Activo.');
    }
    if (!account.allowsTransactions) {
      throw new BadRequestException('Esa cuenta es de agrupación — elige una cuenta que admita movimientos.');
    }
  }

  async findAll(institutionId: string, tenantId: string | null, user: RequestUser) {
    await this.assertInstitutionAccessible(institutionId, tenantId, user);

    const branchScope = await resolveBranchScope(this.prisma, { ...user, institutionId });

    return this.prisma.group.findMany({
      where: {
        institutionId,
        ...(branchScope.unrestricted
          ? {}
          : { OR: [{ branchId: null }, { branchId: { in: branchScope.branchIds } }] }),
      },
      include: {
        groupType: true,
        branch: { select: { id: true, name: true } },
        leader: { select: { id: true, firstName: true, lastName: true } },
        cashAccount: { select: { id: true, code: true, name: true } },
        _count: { select: { members: { where: { leftAt: null } } } },
      },
      orderBy: { name: 'asc' },
    });
  }

  private async findGroupOrThrow(id: string, tenantId: string | null) {
    const group = await this.prisma.group.findFirst({
      where: { id, ...(tenantId ? { institution: { tenantId } } : {}) },
      include: {
        groupType: true,
        branch: { select: { id: true, name: true } },
        leader: { select: { id: true, firstName: true, lastName: true } },
        cashAccount: { select: { id: true, code: true, name: true } },
      },
    });
    if (!group) throw new NotFoundException(`Grupo "${id}" no encontrado`);
    return group;
  }

  async findOne(id: string, tenantId: string | null, user: RequestUser) {
    const group = await this.findGroupOrThrow(id, tenantId);

    if (!user.isSuperadmin) {
      const institutionScope = await resolveInstitutionScope(this.prisma, user);
      if (!institutionScope.unrestricted && !institutionScope.institutionIds.includes(group.institutionId)) {
        throw new NotFoundException(`Grupo "${id}" no encontrado`);
      }

      if (group.branchId) {
        const branchScope = await resolveBranchScope(this.prisma, { ...user, institutionId: group.institutionId });
        if (!branchScope.unrestricted && !branchScope.branchIds.includes(group.branchId)) {
          throw new NotFoundException(`Grupo "${id}" no encontrado`);
        }
      }
    }

    return group;
  }

  // A diferencia de Person, Group NO tiene columna tenant_id propia (ver
  // membresia.prisma) — el tenant se deriva siempre vía institutionId. Por
  // eso, a diferencia de persons.service.ts, acá NO se exige ?tenantId= a un
  // superadmin: assertInstitutionAccessible ya resuelve y valida la
  // institución (y por tanto el tenant) sin necesitarlo.
  async create(tenantId: string | null, dto: CreateGroupDto, user: RequestUser) {
    const institution = await this.assertInstitutionAccessible(dto.institutionId, tenantId, user);
    if (dto.branchId) {
      await this.assertBranchBelongsToInstitution(dto.branchId, dto.institutionId, user);
    }
    if (dto.leaderPersonId) {
      const leader = await this.prisma.person.findFirst({
        where: { id: dto.leaderPersonId, institutionId: dto.institutionId },
      });
      if (!leader) throw new BadRequestException('La persona líder no pertenece a la institución indicada.');
    }
    if (dto.cashAccountId) {
      await this.assertCashAccountValid(dto.cashAccountId, institution.tenantId);
    }

    const created = await this.prisma.group.create({
      data: dto,
      include: {
        groupType: true,
        branch: { select: { id: true, name: true } },
        leader: { select: { id: true, firstName: true, lastName: true } },
        cashAccount: { select: { id: true, code: true, name: true } },
      },
    });

    if (dto.leaderPersonId) {
      await ensureGroupMember(this.prisma, created.id, dto.leaderPersonId);
    }

    return created;
  }

  async update(id: string, tenantId: string | null, dto: UpdateGroupDto, user: RequestUser) {
    const group = await this.findOne(id, tenantId, user);

    const institutionId = dto.institutionId ?? group.institutionId;
    if (dto.institutionId) {
      await this.assertInstitutionAccessible(dto.institutionId, tenantId, user);
    }
    if (dto.branchId) {
      await this.assertBranchBelongsToInstitution(dto.branchId, institutionId, user);
    }
    if (dto.leaderPersonId) {
      const leader = await this.prisma.person.findFirst({
        where: { id: dto.leaderPersonId, institutionId },
      });
      if (!leader) throw new BadRequestException('La persona líder no pertenece a la institución indicada.');
    }
    if (dto.cashAccountId) {
      const institution = await this.prisma.institution.findUniqueOrThrow({ where: { id: institutionId } });
      await this.assertCashAccountValid(dto.cashAccountId, institution.tenantId);
    }

    const updated = await this.prisma.group.update({
      where: { id },
      data: dto,
      include: {
        groupType: true,
        branch: { select: { id: true, name: true } },
        leader: { select: { id: true, firstName: true, lastName: true } },
        cashAccount: { select: { id: true, code: true, name: true } },
      },
    });

    if (dto.leaderPersonId) {
      await ensureGroupMember(this.prisma, id, dto.leaderPersonId);
    }

    return updated;
  }

  // --- Pertenencia (group_members) ---------------------------------------

  async listMembers(groupId: string, tenantId: string | null, user: RequestUser) {
    await this.findOne(groupId, tenantId, user);

    return this.prisma.groupMember.findMany({
      where: { groupId, leftAt: null },
      include: { person: { select: { id: true, firstName: true, lastName: true } } },
      orderBy: { joinedAt: 'asc' },
    });
  }

  async addMember(groupId: string, tenantId: string | null, dto: AddGroupMemberDto, user: RequestUser) {
    const group = await this.findOne(groupId, tenantId, user);

    const person = await this.prisma.person.findFirst({
      where: { id: dto.personId, institutionId: group.institutionId, deletedAt: null },
    });
    if (!person) throw new BadRequestException('La persona no pertenece a la institución de este grupo.');

    // uq_group_members_open (índice único parcial en la base) protege esto
    // también a nivel de motor — este chequeo solo da un mensaje más claro
    // que un error de constraint genérico.
    const alreadyMember = await this.prisma.groupMember.findFirst({
      where: { groupId, personId: dto.personId, leftAt: null },
    });
    if (alreadyMember) {
      throw new ConflictException('Esta persona ya es miembro activo de este grupo.');
    }

    return this.prisma.groupMember.create({
      data: {
        groupId,
        personId: dto.personId,
        role: dto.role,
        joinedAt: dto.joinedAt ? new Date(dto.joinedAt) : undefined,
      },
      include: { person: { select: { id: true, firstName: true, lastName: true } } },
    });
  }

  // Cierra la membresía (leftAt = ahora) — NUNCA borra la fila, es lo que
  // preserva el historial de entradas/salidas que pidió el diseño.
  async removeMember(groupId: string, memberId: string, tenantId: string | null, user: RequestUser) {
    await this.findOne(groupId, tenantId, user);

    const member = await this.prisma.groupMember.findFirst({ where: { id: memberId, groupId, leftAt: null } });
    if (!member) throw new NotFoundException(`Membresía "${memberId}" no encontrada o ya cerrada`);

    return this.prisma.groupMember.update({ where: { id: memberId }, data: { leftAt: new Date() } });
  }
}
