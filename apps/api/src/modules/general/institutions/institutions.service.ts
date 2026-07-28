import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { CreateInstitutionDto } from './dto/create-institution.dto';
import { UpdateInstitutionDto } from './dto/update-institution.dto';

@Injectable()
export class InstitutionsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(tenantId: string) {
    return this.prisma.institution.findMany({
      where: { tenantId, isActive: true },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string, tenantId: string) {
    const institution = await this.prisma.institution.findFirst({
      where: { id, tenantId }, // RLS extra: siempre filtramos por tenantId
      include: { branches: { where: { isActive: true } } },
    });

    if (!institution) {
      throw new NotFoundException(`Institución "${id}" no encontrada`);
    }

    return institution;
  }

  async create(tenantId: string, dto: CreateInstitutionDto) {
    return this.prisma.institution.create({
      data: { ...dto, tenantId },
    });
  }

  async update(id: string, tenantId: string, dto: UpdateInstitutionDto) {
    await this.findOne(id, tenantId);
    return this.prisma.institution.update({ where: { id }, data: dto });
  }
}
