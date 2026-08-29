import { Module } from '@nestjs/common';
import { PrismaModule } from '../../../common/prisma/prisma.module';
import { LedgerModule } from '../ledger/ledger.module';
import { PeriodClosingsService } from './period-closings.service';
import { PeriodClosingsController } from './period-closings.controller';

@Module({
  imports: [PrismaModule, LedgerModule],
  controllers: [PeriodClosingsController],
  providers: [PeriodClosingsService],
  exports: [PeriodClosingsService],
})
export class PeriodClosingsModule {}
