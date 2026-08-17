import { Injectable, BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { CreateAttendanceTagDto } from './dto/create-attendance-tag.dto';
import { UpdateAttendanceTagDto } from './dto/update-attendance-tag.dto';

// Catálogo propio de cada tenant (ver comentario en el modelo AttendanceTag,
// membresia.prisma) — mismo criterio de tenantId que persons.service.ts:
// un superadmin sin ?tenantId= no tiene nada que gestionar acá.
@Injectable()
export class AttendanceTagsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(tenantId: string | null) {
    if (!tenantId) return [];
    return this.prisma.attendanceTag.findMany({ where: { tenantId }, orderBy: { name: 'asc' } });
  }

  async create(tenantId: string | null, dto: CreateAttendanceTagDto) {
    if (!tenantId) {
      throw new BadRequestException('Como superadmin, indica ?tenantId=<uuid> para especificar a qué tenant pertenece la etiqueta.');
    }

    const exists = await this.prisma.attendanceTag.findUnique({
      where: { uq_attendance_tags_tenant_code: { tenantId, code: dto.code } },
    });
    if (exists) {
      throw new ConflictException(`Ya existe una etiqueta con código "${dto.code}" en este tenant.`);
    }

    return this.prisma.attendanceTag.create({ data: { tenantId, code: dto.code, name: dto.name } });
  }

  async update(id: string, tenantId: string | null, dto: UpdateAttendanceTagDto) {
    const tag = await this.prisma.attendanceTag.findFirst({
      where: { id, ...(tenantId ? { tenantId } : {}) },
    });
    if (!tag) throw new NotFoundException(`Etiqueta de asistencia "${id}" no encontrada`);

    return this.prisma.attendanceTag.update({ where: { id }, data: dto });
  }

  async remove(id: string, tenantId: string | null) {
    const tag = await this.prisma.attendanceTag.findFirst({
      where: { id, ...(tenantId ? { tenantId } : {}) },
    });
    if (!tag) throw new NotFoundException(`Etiqueta de asistencia "${id}" no encontrada`);

    await this.prisma.attendanceTag.delete({ where: { id } });
  }
}
