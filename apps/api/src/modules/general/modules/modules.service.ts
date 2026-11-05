import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';

@Injectable()
export class ModulesService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.module.findMany({
      orderBy: [{ isCore: 'desc' }, { name: 'asc' }],
    });
  }
}
