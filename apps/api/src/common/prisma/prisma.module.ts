import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

/**
 * PrismaModule es @Global() para que PrismaService esté disponible
 * en todos los módulos sin necesidad de importarlo explícitamente.
 *
 * Regla: TODA query a BD pasa por PrismaService — nunca SQL crudo salvo
 * casos excepcionales documentados (reportes complejos).
 */
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
