import { Injectable, BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { CreateFundTypeDto } from './dto/create-fund-type.dto';
import { UpdateFundTypeDto } from './dto/update-fund-type.dto';

// Catálogo propio de cada tenant (ver comentario en el modelo FundType,
// membresia.prisma) — mismo criterio que PrivilegeTypesService: solo aplica
// a tenants con alguna institución tipo "church".
@Injectable()
export class FundTypesService {
  constructor(private readonly prisma: PrismaService) {}

  private async assertTenantHasChurchInstitution(tenantId: string) {
    const churchInstitution = await this.prisma.institution.findFirst({
      where: { tenantId, typeCode: 'church', deletedAt: null },
      select: { id: true },
    });
    if (!churchInstitution) {
      throw new BadRequestException('Los fondos recogidos solo aplican a instituciones de tipo iglesia.');
    }
  }

  findAll(tenantId: string | null) {
    if (!tenantId) return [];
    return this.prisma.fundType.findMany({ where: { tenantId }, orderBy: { name: 'asc' } });
  }

  async create(tenantId: string | null, dto: CreateFundTypeDto) {
    if (!tenantId) {
      throw new BadRequestException('Como superadmin, indica ?tenantId=<uuid> para especificar a qué tenant pertenece el tipo de fondo.');
    }
    await this.assertTenantHasChurchInstitution(tenantId);

    const exists = await this.prisma.fundType.findUnique({
      where: { uq_fund_types_tenant_code: { tenantId, code: dto.code } },
    });
    if (exists) {
      throw new ConflictException(`Ya existe un tipo de fondo con código "${dto.code}" en este tenant.`);
    }

    return this.prisma.fundType.create({
      data: { tenantId, code: dto.code, name: dto.name, tracksDonors: dto.tracksDonors ?? false },
    });
  }

  async update(id: string, tenantId: string | null, dto: UpdateFundTypeDto) {
    const type = await this.prisma.fundType.findFirst({
      where: { id, ...(tenantId ? { tenantId } : {}) },
    });
    if (!type) throw new NotFoundException(`Tipo de fondo "${id}" no encontrado`);

    return this.prisma.fundType.update({ where: { id }, data: dto });
  }

  async remove(id: string, tenantId: string | null) {
    const type = await this.prisma.fundType.findFirst({
      where: { id, ...(tenantId ? { tenantId } : {}) },
    });
    if (!type) throw new NotFoundException(`Tipo de fondo "${id}" no encontrado`);

    await this.prisma.fundType.delete({ where: { id } });
  }
}
