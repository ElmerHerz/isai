import { Module } from '@nestjs/common';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { PersonsModule } from './persons/persons.module';
import { GroupsModule } from './groups/groups.module';
import { PositionsModule } from './positions/positions.module';
import { EventsModule } from './events/events.module';
import { AttendanceTagsModule } from './attendance-tags/attendance-tags.module';
import { MilestoneTypesModule } from './milestone-types/milestone-types.module';
import { PrivilegeTypesModule } from './privilege-types/privilege-types.module';
import { FundTypesModule } from './fund-types/fund-types.module';
import { MembershipReportsModule } from './reports/reports.module';

/**
 * MembresiaModule — Schema "membresia" de Postgres
 *
 * v1 completo: Personas + Grupos (con pertenencia con historial) +
 * Directivas (group_positions, con vigencia) + Eventos y Asistencia
 * (events/event_attendance, roster calculado por scope — ver
 * docs/membresia-diseno.md sección 4). `extra_data` de event_attendance
 * (JSONB libre) queda sin exponer en el frontend a propósito — ver la
 * advertencia de esquema-libre en el diseño.
 *
 * Regla: Este módulo es el único que accede al schema "membresia" de Prisma.
 */
@Module({
  imports: [
    PrismaModule,
    PersonsModule,
    GroupsModule,
    PositionsModule,
    EventsModule,
    AttendanceTagsModule,
    MilestoneTypesModule,
    PrivilegeTypesModule,
    FundTypesModule,
    MembershipReportsModule,
  ],
  exports: [
    PersonsModule,
    GroupsModule,
    PositionsModule,
    EventsModule,
    AttendanceTagsModule,
    MilestoneTypesModule,
    PrivilegeTypesModule,
    FundTypesModule,
    MembershipReportsModule,
  ],
})
export class MembresiaModule {}
