import { Module } from '@nestjs/common';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { TenantsModule } from './tenants/tenants.module';
import { InstitutionsModule } from './institutions/institutions.module';
import { BranchesModule } from './branches/branches.module';

/**
 * GeneralModule — Schema "general" de Postgres
 *
 * Contiene los recursos base del sistema:
 * - Tenants (organizaciones cliente)
 * - Institutions (instituciones dentro de un tenant)
 * - Branches (sucursales dentro de una institución)
 *
 * Regla: Este módulo es el único que accede al schema "general" de Prisma.
 * Si otro módulo necesita datos de aquí, usa los servicios exportados.
 */
@Module({
  imports: [
    PrismaModule,
    TenantsModule,
    InstitutionsModule,
    BranchesModule,
  ],
  exports: [
    TenantsModule,
    InstitutionsModule,
    BranchesModule,
  ],
})
export class GeneralModule {}
