import {
  Injectable, NotFoundException, ConflictException, BadRequestException, ForbiddenException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { AssignRoleDto } from './dto/assign-role.dto';
import { resolveInstitutionScope, resolveBranchScope } from '../../../common/utils/institution-scope.util';
import type { RequestUser } from '../../../common/decorators/current-user.decorator';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  // tenantId === null → superadmin sin tenant seleccionado: ve todos los tenants.
  // No se filtra por isActive — un usuario desactivado debe seguir siendo
  // visible (con su badge en "Inactivo") para poder reactivarlo, no desaparecer.
  async findAll(tenantId: string | null) {
    const users = await this.prisma.user.findMany({
      where: { ...(tenantId ? { tenantId } : {}) },
      select: {
        id: true, email: true, firstName: true, lastName: true,
        isActive: true, lastLoginAt: true, createdAt: true,
        userRoles: { include: { role: { select: { name: true } } } },
      },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
    });

    return users.map(({ userRoles, ...user }) => ({
      ...user,
      roles: userRoles.map((ur) => ur.role.name),
    }));
  }

  async findOne(id: string, tenantId: string | null) {
    const user = await this.prisma.user.findFirst({
      where: { id, ...(tenantId ? { tenantId } : {}) },
      select: {
        id: true, tenantId: true, email: true, firstName: true, lastName: true,
        isActive: true, lastLoginAt: true, createdAt: true,
        userRoles: { include: { role: true } },
      },
    });

    if (!user) throw new NotFoundException(`Usuario "${id}" no encontrado`);
    return user;
  }

  async create(tenantId: string | null, dto: CreateUserDto) {
    if (!tenantId) {
      throw new BadRequestException(
        'Como superadmin, indica ?tenantId=<uuid> para especificar a qué tenant pertenece el usuario.',
      );
    }

    const exists = await this.prisma.user.findFirst({
      where: { tenantId, email: dto.email },
    });

    if (exists) {
      throw new ConflictException(`Ya existe un usuario con email "${dto.email}" en este tenant`);
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);

    return this.prisma.user.create({
      data: {
        tenantId,
        email: dto.email,
        passwordHash,
        firstName: dto.firstName,
        lastName: dto.lastName,
      },
      select: {
        id: true, email: true, firstName: true, lastName: true,
        isActive: true, createdAt: true,
      },
    });
  }

  async update(id: string, tenantId: string | null, dto: UpdateUserDto) {
    await this.findOne(id, tenantId);

    const data: Record<string, unknown> = { ...dto };

    // Si viene nueva contraseña, hashearla
    if (dto.password) {
      data['passwordHash'] = await bcrypt.hash(dto.password, 12);
      delete data['password'];
    }

    return this.prisma.user.update({
      where: { id },
      data,
      select: {
        id: true, email: true, firstName: true, lastName: true,
        isActive: true, updatedAt: true,
      },
    });
  }

  async assignRole(
    userId: string,
    tenantId: string | null,
    dto: AssignRoleDto,
    currentUser: RequestUser,
  ) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, ...(tenantId ? { tenantId } : {}) },
    });
    if (!user) throw new NotFoundException(`Usuario "${userId}" no encontrado`);

    const role = await this.prisma.role.findUnique({ where: { id: dto.roleId } });
    if (!role) throw new NotFoundException(`Rol "${dto.roleId}" no encontrado`);

    // isSuperadmin en el JWT solo depende de tener asignado el rol de sistema
    // "superadmin" (ver AuthService.login) — NO depende de que tenantId sea
    // null. Sin este check, cualquier Administrador de tenant con permiso
    // security.user.update podría auto-otorgarse acceso total a la plataforma
    // asignándose ese rol a sí mismo o a otro usuario de su tenant.
    if (role.code === 'superadmin' && role.isSystem && !currentUser.isSuperadmin) {
      throw new ForbiddenException('Solo un superadmin puede asignar el rol de Super Administrador.');
    }

    // El rol debe ser de sistema (tenantId null) o del mismo tenant que el usuario.
    if (role.tenantId !== null && role.tenantId !== user.tenantId) {
      throw new BadRequestException('Ese rol pertenece a otro tenant.');
    }

    // Refleja el CHECK de la base (chk_scope): branchId requiere institutionId.
    if (dto.branchId && !dto.institutionId) {
      throw new BadRequestException('No puedes indicar una sucursal sin indicar la institución.');
    }

    if (dto.institutionId) {
      const institution = await this.prisma.institution.findFirst({
        where: { id: dto.institutionId, tenantId: user.tenantId ?? undefined },
      });
      if (!institution) {
        throw new BadRequestException('La institución no pertenece al tenant del usuario.');
      }
    }

    if (dto.branchId) {
      const branch = await this.prisma.branch.findFirst({
        where: { id: dto.branchId, institutionId: dto.institutionId },
      });
      if (!branch) {
        throw new BadRequestException('La sucursal no pertenece a la institución indicada.');
      }
    }

    // Que la institución/sucursal exista y sea del tenant correcto no basta:
    // quien asigna el rol también debe tener alcance sobre ella. Sin esto,
    // un Administrador con scope en la Institución A podría asignar roles
    // con scope en la Institución B (que no puede ni ver) a cualquier
    // usuario del tenant — mismo tipo de fuga que la de findAllForTenant.
    if (!currentUser.isSuperadmin && dto.institutionId) {
      const institutionScope = await resolveInstitutionScope(this.prisma, currentUser);
      if (!institutionScope.unrestricted && !institutionScope.institutionIds.includes(dto.institutionId)) {
        throw new ForbiddenException('No puedes asignar un rol con alcance en una institución fuera de tu propio alcance.');
      }

      if (dto.branchId) {
        const branchScope = await resolveBranchScope(this.prisma, {
          ...currentUser,
          institutionId: dto.institutionId,
        });
        if (!branchScope.unrestricted && !branchScope.branchIds.includes(dto.branchId)) {
          throw new ForbiddenException('No puedes asignar un rol con alcance en una sucursal fuera de tu propio alcance.');
        }
      }
    }

    return this.prisma.userRole.create({
      data: {
        userId,
        roleId: dto.roleId,
        institutionId: dto.institutionId ?? null,
        branchId: dto.branchId ?? null,
        grantedBy: currentUser.userId,
      },
      include: { role: true },
    });
  }
}
