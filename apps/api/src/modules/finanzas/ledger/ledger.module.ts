import { Module } from '@nestjs/common';
import { PrismaModule } from '../../../common/prisma/prisma.module';
import { LedgerService } from './ledger.service';

// Módulo hoja a propósito — sin depender de GroupsModule/Membresía ni de
// nada más de Finanzas, para que EventsModule (en Membresía) pueda
// importarlo directo sin crear un ciclo Finanzas→Membresía→Finanzas (ver
// FinanzasModule, que sí importa GroupsModule vía GroupFundsModule).
@Module({
  imports: [PrismaModule],
  providers: [LedgerService],
  exports: [LedgerService],
})
export class LedgerModule {}
