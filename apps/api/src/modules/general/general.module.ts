import { Module } from '@nestjs/common';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { TenantsModule } from './tenants/tenants.module';
import { InstitutionsModule } from './institutions/institutions.module';
import { BranchesModule } from './branches/branches.module';
import { MenusModule } from './menus/menus.module';
import { InstitutionTypesModule } from './institution-types/institution-types.module';
import { CurrenciesModule } from './currencies/currencies.module';
import { CountriesModule } from './countries/countries.module';
import { LanguagesModule } from './languages/languages.module';
import { CatalogItemsModule } from './catalog-items/catalog-items.module';
import { BranchSchedulesModule } from './branch-schedules/branch-schedules.module';
import { DocumentSequencesModule } from './document-sequences/document-sequences.module';
import { ModulesModule } from './modules/modules.module';

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
    MenusModule,
    InstitutionTypesModule,
    CurrenciesModule,
    CountriesModule,
    LanguagesModule,
    CatalogItemsModule,
    BranchSchedulesModule,
    DocumentSequencesModule,
    ModulesModule,
  ],
  exports: [
    TenantsModule,
    InstitutionsModule,
    BranchesModule,
    MenusModule,
    InstitutionTypesModule,
    CurrenciesModule,
    CountriesModule,
    LanguagesModule,
    CatalogItemsModule,
    BranchSchedulesModule,
    DocumentSequencesModule,
    ModulesModule,
  ],
})
export class GeneralModule {}
