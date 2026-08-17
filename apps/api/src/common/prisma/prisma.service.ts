import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { tenantContextStorage } from './tenant-context';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  async onModuleInit() {
    await this.$connect();
    this.setupTenantMiddleware();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  // Ejecuta SET LOCAL app.current_tenant_id antes de cada operación de
  // modelo, dentro de una transacción interactiva dedicada a esa operación,
  // para que las políticas RLS de Postgres actúen como segunda capa de
  // defensa (no solo el `where: tenantId` de cada service). `next(params)`
  // ya dispara la query contra la conexión por defecto (no es diferible,
  // por eso no se puede meter en un $transaction([...]) en array); en vez de
  // eso se re-despacha manualmente la misma operación (`params.model` /
  // `params.action`) contra el cliente `tx` de una transacción interactiva.
  //
  // Se salta cuando: no hay tenant activo (superadmin sin ?tenantId=,
  // scripts fuera de un request HTTP), la operación no tiene modelo (raw
  // queries), o ya corre dentro de una transacción explícita del propio
  // código (`$transaction([...])` / `$transaction(async tx => ...)`) — esto
  // último también cubre las operaciones que corren DENTRO de la
  // transacción interactiva que este mismo middleware abre más abajo, ya
  // que Prisma marca `runInTransaction=true` para ellas, evitando anidar
  // una transacción dentro de otra.
  private setupTenantMiddleware() {
    this.$use(async (params, next) => {
      const tenantId = tenantContextStorage.getStore()?.tenantId ?? null;

      if (!tenantId || params.runInTransaction || !params.model) {
        return next(params);
      }

      const modelKey = params.model.charAt(0).toLowerCase() + params.model.slice(1);

      const action = params.action;

      return this.$transaction(async (tx) => {
        await tx.$executeRaw`SELECT set_config('app.current_tenant_id', ${tenantId}, true)`;
        const delegate = (tx as unknown as Record<string, Record<string, (args: unknown) => unknown>>)[
          modelKey
        ]!;
        return delegate[action]!(params.args);
      });
    });
  }
}
