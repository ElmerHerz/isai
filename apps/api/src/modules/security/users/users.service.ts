import {
  Injectable, NotFoundException, ConflictException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(tenantId: string) {
    return this.prisma.user.findMany({
      where: { tenantId, isActive: true },
      select: {
        id: true, email: true, firstName: true, lastName: true,
        isActive: true, lastLoginAt: true, createdAt: true,
        // Nunca devolvemos passwordHash
      },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
    });
  }

  async findOne(id: string, tenantId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id, tenantId },
      select: {
        id: true, email: true, firstName: true, lastName: true,
        isActive: true, lastLoginAt: true, createdAt: true,
        userRoles: { include: { role: true } },
      },
    });

    if (!user) throw new NotFoundException(`Usuario "${id}" no encontrado`);
    return user;
  }

  async create(tenantId: string, dto: CreateUserDto) {
    const exists = await this.prisma.user.findFirst({
      where: { tenantId, email: dto.email },
    });

    if (exists) {
      throw new ConflictException(`Ya existe un usuario con email "${dto.email}" en este tenant`);
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);

    return this.prisma.user.create({
      data: {
        tenantId,
        email: dto.email,
        passwordHash,
        firstName: dto.firstName,
        lastName: dto.lastName,
      },
      select: {
        id: true, email: true, firstName: true, lastName: true,
        isActive: true, createdAt: true,
      },
    });
  }

  async update(id: string, tenantId: string, dto: UpdateUserDto) {
    await this.findOne(id, tenantId);

    const data: Record<string, unknown> = { ...dto };

    // Si viene nueva contraseña, hashearla
    if (dto.password) {
      data['passwordHash'] = await bcrypt.hash(dto.password, 12);
      delete data['password'];
    }

    return this.prisma.user.update({
      where: { id },
      data,
      select: {
        id: true, email: true, firstName: true, lastName: true,
        isActive: true, updatedAt: true,
      },
    });
  }
}
