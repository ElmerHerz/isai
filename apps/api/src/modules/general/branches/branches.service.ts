import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { CreateBranchDto } from './dto/create-branch.dto';
import { UpdateBranchDto } from './dto/update-branch.dto';

@Injectable()
export class BranchesService {
  constructor(private readonly prisma: PrismaService) {}

  // Branch no tiene columna tenant_id propia — la pertenencia al tenant se
  // valida siempre a través de la relación institution.tenantId.
  async findAll(institutionId: string, tenantId: string) {
    return this.prisma.branch.findMany({
      where: { institutionId, institution: { tenantId }, isActive: true },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string, institutionId: string, tenantId: string) {
    const branch = await this.prisma.branch.findFirst({
      where: { id, institutionId, institution: { tenantId } },
    });

    if (!branch) {
      throw new NotFoundException(`Sucursal "${id}" no encontrada`);
    }

    return branch;
  }

  async create(institutionId: string, tenantId: string, dto: CreateBranchDto) {
    const institution = await this.prisma.institution.findFirst({
      where: { id: institutionId, tenantId },
    });

    if (!institution) {
      throw new NotFoundException(`Institución "${institutionId}" no encontrada`);
    }

    return this.prisma.branch.create({
      data: { ...dto, institutionId },
    });
  }

  async update(id: string, institutionId: string, tenantId: string, dto: UpdateBranchDto) {
    await this.findOne(id, institutionId, tenantId);
    return this.prisma.branch.update({ where: { id }, data: dto });
  }
}
