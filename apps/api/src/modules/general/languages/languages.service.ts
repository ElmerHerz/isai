import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { CreateLanguageDto } from './dto/create-language.dto';
import { UpdateLanguageDto } from './dto/update-language.dto';

@Injectable()
export class LanguagesService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.language.findMany({ orderBy: { code: 'asc' } });
  }

  async create(dto: CreateLanguageDto) {
    const exists = await this.prisma.language.findUnique({ where: { code: dto.code } });
    if (exists) {
      throw new ConflictException(`Ya existe un idioma con código "${dto.code}"`);
    }

    return this.prisma.language.create({ data: dto });
  }

  async update(code: string, dto: UpdateLanguageDto) {
    const language = await this.prisma.language.findUnique({ where: { code } });
    if (!language) throw new NotFoundException(`Idioma "${code}" no encontrado`);

    return this.prisma.language.update({ where: { code }, data: dto });
  }
}
