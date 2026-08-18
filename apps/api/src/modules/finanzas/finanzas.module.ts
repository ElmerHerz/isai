import { Module } from '@nestjs/common';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { AccountsModule } from './accounts/accounts.module';
import { JournalEntriesModule } from './journal-entries/journal-entries.module';
import { ReportsModule } from './reports/reports.module';
import { ProjectsModule } from './projects/projects.module';
import { GroupFundsModule } from './group-funds/group-funds.module';

/**
 * FinanzasModule — Schema "finanzas" de Postgres
 *
 * Recorte 1: catálogo de cuentas (solo lectura, con saldo) + asientos
 * contables (solo lectura) + un reporte único de totales por sucursal/grupo
 * (ReportsModule, la "consulta B" del SQL original). La creación de
 * asientos vive en MembresiaModule::EventsService
 * (postFundCollectionToLedger, el botón "Contabilizar"), no acá — a
 * propósito, ver plan de sesión. El formulario de asiento manual y los
 * reportes formales (balance general, estado de resultados) quedan para
 * una fase 2.
 *
 * Parte A del plan "Proyectos + Fondo de grupo": ProjectsModule (campañas
 * de recaudación con meta/fecha, mismo patrón Contabilizar). Parte B
 * (fondo propio de grupo): GroupFundsModule — originalmente vivió en
 * MembresiaModule porque cuelga de Group, pero se movió acá (ver
 * conversación de sesión): es un asiento contable real, no un dato de
 * membresía, y el mismo criterio ya lo seguía ProjectsModule (que también
 * referencia Group/Person sin vivir en Membresía). Importa GroupsModule
 * directo desde MembresiaModule para validar institución/sucursal/scope del
 * grupo — no hay ciclo, MembresiaModule ya no depende de esto.
 *
 * Regla: Este módulo es el único que accede al schema "finanzas" de Prisma.
 */
@Module({
  imports: [PrismaModule, AccountsModule, JournalEntriesModule, ReportsModule, ProjectsModule, GroupFundsModule],
  exports: [AccountsModule, JournalEntriesModule, ReportsModule, ProjectsModule, GroupFundsModule],
})
export class FinanzasModule {}
