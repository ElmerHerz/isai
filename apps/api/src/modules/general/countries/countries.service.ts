import { Injectable, ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { CreateCountryDto } from './dto/create-country.dto';
import { UpdateCountryDto } from './dto/update-country.dto';

@Injectable()
export class CountriesService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.country.findMany({ orderBy: { code: 'asc' } });
  }

  private async assertCurrencyExists(defaultCurrencyCode?: string) {
    if (!defaultCurrencyCode) return;
    const currency = await this.prisma.currency.findUnique({ where: { code: defaultCurrencyCode } });
    if (!currency) {
      throw new BadRequestException(`La moneda "${defaultCurrencyCode}" no existe en el catálogo de monedas.`);
    }
  }

  async create(dto: CreateCountryDto) {
    const exists = await this.prisma.country.findUnique({ where: { code: dto.code } });
    if (exists) {
      throw new ConflictException(`Ya existe un país con código "${dto.code}"`);
    }
    await this.assertCurrencyExists(dto.defaultCurrencyCode);

    return this.prisma.country.create({ data: dto });
  }

  async update(code: string, dto: UpdateCountryDto) {
    const country = await this.prisma.country.findUnique({ where: { code } });
    if (!country) throw new NotFoundException(`País "${code}" no encontrado`);
    await this.assertCurrencyExists(dto.defaultCurrencyCode);

    return this.prisma.country.update({ where: { code }, data: dto });
  }
}
