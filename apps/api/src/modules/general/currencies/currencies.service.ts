import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { CreateCurrencyDto } from './dto/create-currency.dto';
import { UpdateCurrencyDto } from './dto/update-currency.dto';

@Injectable()
export class CurrenciesService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.currency.findMany({ orderBy: { code: 'asc' } });
  }

  async create(dto: CreateCurrencyDto) {
    const exists = await this.prisma.currency.findUnique({ where: { code: dto.code } });
    if (exists) {
      throw new ConflictException(`Ya existe una moneda con código "${dto.code}"`);
    }

    return this.prisma.currency.create({ data: dto });
  }

  async update(code: string, dto: UpdateCurrencyDto) {
    const currency = await this.prisma.currency.findUnique({ where: { code } });
    if (!currency) throw new NotFoundException(`Moneda "${code}" no encontrada`);

    return this.prisma.currency.update({ where: { code }, data: dto });
  }
}
