import { Injectable, BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { CreatePrivilegeTypeDto } from './dto/create-privilege-type.dto';
import { UpdatePrivilegeTypeDto } from './dto/update-privilege-type.dto';

// Catálogo propio de cada tenant (ver comentario en el modelo PrivilegeType,
// membresia.prisma) — mismo criterio que MilestoneTypesService: solo aplica
// a tenants con alguna institución tipo "church".
@Injectable()
export class PrivilegeTypesService {
  constructor(private readonly prisma: PrismaService) {}

  private async assertTenantHasChurchInstitution(tenantId: string) {
    const churchInstitution = await this.prisma.institution.findFirst({
      where: { tenantId, typeCode: 'church', deletedAt: null },
      select: { id: true },
    });
    if (!churchInstitution) {
      throw new BadRequestException('Los privilegios de culto solo aplican a instituciones de tipo iglesia.');
    }
  }

  findAll(tenantId: string | null) {
    if (!tenantId) return [];
    return this.prisma.privilegeType.findMany({ where: { tenantId }, orderBy: { name: 'asc' } });
  }

  async create(tenantId: string | null, dto: CreatePrivilegeTypeDto) {
    if (!tenantId) {
      throw new BadRequestException('Como superadmin, indica ?tenantId=<uuid> para especificar a qué tenant pertenece el tipo de privilegio.');
    }
    await this.assertTenantHasChurchInstitution(tenantId);

    const exists = await this.prisma.privilegeType.findUnique({
      where: { uq_privilege_types_tenant_code: { tenantId, code: dto.code } },
    });
    if (exists) {
      throw new ConflictException(`Ya existe un tipo de privilegio con código "${dto.code}" en este tenant.`);
    }

    return this.prisma.privilegeType.create({ data: { tenantId, code: dto.code, name: dto.name } });
  }

  async update(id: string, tenantId: string | null, dto: UpdatePrivilegeTypeDto) {
    const type = await this.prisma.privilegeType.findFirst({
      where: { id, ...(tenantId ? { tenantId } : {}) },
    });
    if (!type) throw new NotFoundException(`Tipo de privilegio "${id}" no encontrado`);

    return this.prisma.privilegeType.update({ where: { id }, data: dto });
  }

  async remove(id: string, tenantId: string | null) {
    const type = await this.prisma.privilegeType.findFirst({
      where: { id, ...(tenantId ? { tenantId } : {}) },
    });
    if (!type) throw new NotFoundException(`Tipo de privilegio "${id}" no encontrado`);

    await this.prisma.privilegeType.delete({ where: { id } });
  }
}
