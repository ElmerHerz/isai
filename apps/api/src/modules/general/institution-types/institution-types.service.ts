import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { CreateInstitutionTypeDto } from './dto/create-institution-type.dto';
import { UpdateInstitutionTypeDto } from './dto/update-institution-type.dto';

@Injectable()
export class InstitutionTypesService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.institutionType.findMany({ orderBy: { name: 'asc' } });
  }

  async create(dto: CreateInstitutionTypeDto) {
    const exists = await this.prisma.institutionType.findUnique({ where: { code: dto.code } });
    if (exists) {
      throw new ConflictException(`Ya existe un tipo de institución con código "${dto.code}"`);
    }

    return this.prisma.institutionType.create({ data: dto });
  }

  async update(code: string, dto: UpdateInstitutionTypeDto) {
    const institutionType = await this.prisma.institutionType.findUnique({ where: { code } });
    if (!institutionType) throw new NotFoundException(`Tipo de institución "${code}" no encontrado`);

    return this.prisma.institutionType.update({ where: { code }, data: dto });
  }
}
