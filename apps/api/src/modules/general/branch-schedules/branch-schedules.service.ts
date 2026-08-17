import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { CreateBranchScheduleDto } from './dto/create-branch-schedule.dto';
import { UpdateBranchScheduleDto } from './dto/update-branch-schedule.dto';

const SCHEDULE_TYPE_CATALOG_CODE = 'schedule_type';

// "HH:mm" o "HH:mm:ss" -> Date (Prisma solo usa la parte de hora en columnas @db.Time).
// Usa Date.UTC explícito, NO `new Date("1970-01-01THH:mm:ss")` — ese string
// sin sufijo de zona lo interpreta V8 como hora LOCAL del proceso de Node,
// así que el valor de reloj (ej. "14:00", sin ninguna zona horaria real
// asociada — es solo "2pm para esa sucursal") se corría varias horas al
// guardar según la zona horaria del servidor. Date.UTC fija los números tal
// cual, sin que ninguna zona horaria los toque en el camino.
function toTimeDate(value: string): Date {
  const [hours, minutes, seconds] = value.split(':').map(Number);
  return new Date(Date.UTC(1970, 0, 1, hours, minutes, seconds || 0));
}

// El acceso a la sucursal (¿tiene el usuario alcance sobre ella?) lo afirma
// ScopeGuard vía @RequireScope() en branch-schedules.controller.ts antes de
// que estos métodos se ejecuten.
@Injectable()
export class BranchSchedulesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(branchId: string) {
    return this.prisma.branchSchedule.findMany({
      where: { branchId },
      include: { scheduleType: true },
      orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
    });
  }

  private async assertScheduleTypeExists(scheduleTypeId: string) {
    const scheduleType = await this.prisma.catalogItem.findUnique({ where: { id: scheduleTypeId } });
    if (!scheduleType || scheduleType.catalogCode !== SCHEDULE_TYPE_CATALOG_CODE) {
      throw new BadRequestException(`El tipo de horario "${scheduleTypeId}" no existe en el catálogo.`);
    }
  }

  async create(branchId: string, dto: CreateBranchScheduleDto) {
    await this.assertScheduleTypeExists(dto.scheduleTypeId);

    return this.prisma.branchSchedule.create({
      data: {
        branchId,
        scheduleTypeId: dto.scheduleTypeId,
        dayOfWeek: dto.dayOfWeek,
        startTime: toTimeDate(dto.startTime),
        endTime: dto.endTime ? toTimeDate(dto.endTime) : undefined,
        label: dto.label,
      },
      include: { scheduleType: true },
    });
  }

  async update(id: string, branchId: string, dto: UpdateBranchScheduleDto) {
    const schedule = await this.prisma.branchSchedule.findFirst({ where: { id, branchId } });
    if (!schedule) throw new NotFoundException(`Franja de horario "${id}" no encontrada`);

    if (dto.scheduleTypeId) {
      await this.assertScheduleTypeExists(dto.scheduleTypeId);
    }

    return this.prisma.branchSchedule.update({
      where: { id },
      data: {
        scheduleTypeId: dto.scheduleTypeId,
        dayOfWeek: dto.dayOfWeek,
        startTime: dto.startTime ? toTimeDate(dto.startTime) : undefined,
        endTime: dto.endTime ? toTimeDate(dto.endTime) : undefined,
        label: dto.label,
      },
      include: { scheduleType: true },
    });
  }

  async remove(id: string, branchId: string) {
    const schedule = await this.prisma.branchSchedule.findFirst({ where: { id, branchId } });
    if (!schedule) throw new NotFoundException(`Franja de horario "${id}" no encontrada`);

    return this.prisma.branchSchedule.delete({ where: { id } });
  }
}
