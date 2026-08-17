import { Injectable, BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { CreateMilestoneTypeDto } from './dto/create-milestone-type.dto';
import { UpdateMilestoneTypeDto } from './dto/update-milestone-type.dto';

// Catálogo propio de cada tenant (ver comentario en el modelo MilestoneType,
// membresia.prisma) — mismo criterio de tenantId que attendance-tags. A
// diferencia de ese, esto solo tiene sentido si el tenant tiene alguna
// institución de tipo "church" — se valida antes de crear.
@Injectable()
export class MilestoneTypesService {
  constructor(private readonly prisma: PrismaService) {}

  private async assertTenantHasChurchInstitution(tenantId: string) {
    const churchInstitution = await this.prisma.institution.findFirst({
      where: { tenantId, typeCode: 'church', deletedAt: null },
      select: { id: true },
    });
    if (!churchInstitution) {
      throw new BadRequestException('Los hitos espirituales solo aplican a instituciones de tipo iglesia.');
    }
  }

  findAll(tenantId: string | null) {
    if (!tenantId) return [];
    return this.prisma.milestoneType.findMany({ where: { tenantId }, orderBy: { name: 'asc' } });
  }

  async create(tenantId: string | null, dto: CreateMilestoneTypeDto) {
    if (!tenantId) {
      throw new BadRequestException('Como superadmin, indica ?tenantId=<uuid> para especificar a qué tenant pertenece el tipo de hito.');
    }
    await this.assertTenantHasChurchInstitution(tenantId);

    const exists = await this.prisma.milestoneType.findUnique({
      where: { uq_milestone_types_tenant_code: { tenantId, code: dto.code } },
    });
    if (exists) {
      throw new ConflictException(`Ya existe un tipo de hito con código "${dto.code}" en este tenant.`);
    }

    return this.prisma.milestoneType.create({ data: { tenantId, code: dto.code, name: dto.name } });
  }

  async update(id: string, tenantId: string | null, dto: UpdateMilestoneTypeDto) {
    const type = await this.prisma.milestoneType.findFirst({
      where: { id, ...(tenantId ? { tenantId } : {}) },
    });
    if (!type) throw new NotFoundException(`Tipo de hito "${id}" no encontrado`);

    return this.prisma.milestoneType.update({ where: { id }, data: dto });
  }

  async remove(id: string, tenantId: string | null) {
    const type = await this.prisma.milestoneType.findFirst({
      where: { id, ...(tenantId ? { tenantId } : {}) },
    });
    if (!type) throw new NotFoundException(`Tipo de hito "${id}" no encontrado`);

    await this.prisma.milestoneType.delete({ where: { id } });
  }
}
