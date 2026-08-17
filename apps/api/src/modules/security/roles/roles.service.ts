import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import type { RequestUser } from '../../../common/decorators/current-user.decorator';

@Injectable()
export class RolesService {
  constructor(private readonly prisma: PrismaService) {}

  // "superadmin" nunca se toca, ni siquiera por superadmin: su code literal
  // es la llave que activa el bypass total (ver AuthService.login) — si se
  // edita por error, se pierde el superadmin de la plataforma sin forma de
  // recuperarlo desde la UI. "admin" (y cualquier otro rol de sistema futuro)
  // sí se puede editar, pero únicamente por un superadmin — un usuario con
  // el rol Administrador no debe poder tocar la definición del rol que usa
  // él mismo (y todos los demás admins de tenant).
  private assertRoleEditable(role: { isSystem: boolean; code: string; name: string }, user: RequestUser) {
    if (!role.isSystem) return;

    if (role.code === 'superadmin') {
      throw new BadRequestException(
        'El rol "Super Administrador" nunca se puede editar, eliminar ni reasignar sus permisos — es la llave que activa el acceso total del sistema.',
      );
    }

    if (!user.isSuperadmin) {
      throw new BadRequestException(`El rol "${role.name}" es un rol de sistema — solo un superadmin puede editarlo.`);
    }
  }

  // Eliminar un rol de sistema (cualquiera) sigue bloqueado sin excepción —
  // a diferencia de editar, borrar "admin" es irreversible desde la UI y
  // rompería el invariante de "todo tenant nuevo tiene al menos un rol
  // asignable" para cualquier tenant que ya lo esté usando.
  private assertNotSystemRole(role: { isSystem: boolean; name: string }) {
    if (role.isSystem) {
      throw new BadRequestException(
        `El rol "${role.name}" es un rol de sistema y no se puede eliminar.`,
      );
    }
  }

  // tenantId === null → superadmin sin tenant seleccionado: ve roles de
  // sistema y de todos los tenants. Con un tenant concreto, además de sus
  // roles propios siempre se incluyen los de sistema (tenantId null,
  // ej. "admin") — si no, un tenant recién creado no tendría ningún rol
  // asignable hasta crear uno propio. El rol "superadmin" se excluye de las
  // consultas con tenant: es de la plataforma, no algo que un tenant pueda
  // ver ni asignar (ver también el check en UsersService.assignRole).
  async findAll(tenantId: string | null) {
    return this.prisma.role.findMany({
      where: {
        ...(tenantId
          ? { OR: [{ tenantId }, { tenantId: null, code: { not: 'superadmin' } }] }
          : {}),
        deletedAt: null,
      },
      include: {
        rolePermissions: { include: { permission: true } },
      },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string, tenantId: string | null) {
    const role = await this.prisma.role.findFirst({
      where: { id, ...(tenantId ? { tenantId } : {}) },
      include: { rolePermissions: { include: { permission: true } } },
    });

    if (!role) throw new NotFoundException(`Rol "${id}" no encontrado`);
    return role;
  }

  async create(tenantId: string | null, dto: CreateRoleDto) {
    if (!tenantId) {
      throw new BadRequestException(
        'Como superadmin, indica ?tenantId=<uuid> para especificar a qué tenant pertenece el rol.',
      );
    }

    await this.assertCodeAvailable(tenantId, dto.code);

    return this.prisma.role.create({
      data: { ...dto, tenantId },
    });
  }

  async update(id: string, tenantId: string | null, dto: UpdateRoleDto, user: RequestUser) {
    const role = await this.findOne(id, tenantId);
    this.assertRoleEditable(role, user);

    if (dto.code && dto.code !== role.code) {
      await this.assertCodeAvailable(role.tenantId, dto.code, id);
    }

    return this.prisma.role.update({ where: { id }, data: dto });
  }

  // El código de rol es único por tenant (uq_roles_tenant_code) — se valida
  // antes de escribir para devolver un 409 claro en vez de dejar que truene
  // el constraint de la base como un 500 genérico.
  private async assertCodeAvailable(tenantId: string | null, code: string, excludeId?: string) {
    const existing = await this.prisma.role.findFirst({
      where: { tenantId, code, deletedAt: null, ...(excludeId ? { id: { not: excludeId } } : {}) },
    });
    if (existing) {
      throw new ConflictException(`Ya existe un rol con código "${code}" en este tenant`);
    }
  }

  async remove(id: string, tenantId: string | null) {
    const role = await this.findOne(id, tenantId);
    this.assertNotSystemRole(role);
    // Soft delete (roles no tiene isActive, se maneja con deletedAt)
    return this.prisma.role.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async assignPermissions(id: string, tenantId: string | null, permissionIds: string[], user: RequestUser) {
    const role = await this.findOne(id, tenantId);
    this.assertRoleEditable(role, user);

    // Reemplaza todos los permisos del rol (delete + createMany en transacción)
    return this.prisma.$transaction([
      this.prisma.rolePermission.deleteMany({ where: { roleId: id } }),
      this.prisma.rolePermission.createMany({
        data: permissionIds.map((permissionId) => ({ roleId: id, permissionId })),
      }),
    ]);
  }
}
