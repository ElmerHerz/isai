import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';

@Injectable()
export class PermissionsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.permission.findMany({
      include: { module: { select: { code: true, name: true, colorHex: true } } },
      orderBy: [{ moduleCode: 'asc' }, { resource: 'asc' }, { actionCode: 'asc' }],
    });
  }
}
