import { Module } from '@nestjs/common';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { AccountsModule } from './accounts/accounts.module';
import { JournalEntriesModule } from './journal-entries/journal-entries.module';
import { ReportsModule } from './reports/reports.module';
import { GroupFundsModule } from './group-funds/group-funds.module';
import { LedgerModule } from './ledger/ledger.module';

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
 * GroupFundsModule (fondo propio de grupo) — originalmente vivió en
 * MembresiaModule porque cuelga de Group, pero se movió acá (ver
 * conversación de sesión): es un asiento contable real, no un dato de
 * membresía. Importa GroupsModule directo desde MembresiaModule para
 * validar institución/sucursal/scope del grupo — no hay ciclo, MembresiaModule
 * ya no depende de esto.
 *
 * ProjectsModule (campañas de recaudación con meta/fecha) vivió acá hasta
 * la separación de módulo — ver docs/finanzas-mejoras-propuestas.md §6:
 * ahora es ProyectosModule, su propio schema. LedgerModule queda exportado
 * de acá porque Proyectos (y EventsModule en Membresía) lo consumen para
 * contabilizar sin acceso directo al schema finanzas.
 *
 * Regla: Este módulo es el único que accede al schema "finanzas" de Prisma.
 */
@Module({
  imports: [PrismaModule, AccountsModule, JournalEntriesModule, ReportsModule, GroupFundsModule, LedgerModule],
  exports: [AccountsModule, JournalEntriesModule, ReportsModule, GroupFundsModule, LedgerModule],
})
export class FinanzasModule {}
