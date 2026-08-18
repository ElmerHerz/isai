import { PrismaService } from '../../../common/prisma/prisma.service';

// Asignar a alguien como líder de un grupo (GroupsService) o darle un cargo
// de directiva (PositionsService) implica, en la práctica, que "pertenece"
// a ese grupo — sin este auto-alta quedaba una inconsistencia real: la
// persona aparecía como líder/directivo pero NO en "Miembros actuales" (ni
// contaba en el roster de asistencia por grupo, ni en _count.members),
// porque group_members es una tabla aparte que nadie llenaba
// automáticamente. Mismo criterio idempotente que GroupsService.addMember:
// solo crea si no hay ya una membresía abierta (leftAt IS NULL) para esa
// persona en ese grupo — nunca duplica ni reabre una que se cerró a propósito.
export async function ensureGroupMember(prisma: PrismaService, groupId: string, personId: string) {
  const existing = await prisma.groupMember.findFirst({
    where: { groupId, personId, leftAt: null },
  });
  if (existing) return;

  await prisma.groupMember.create({ data: { groupId, personId } });
}
