import { Module } from '@nestjs/common';
import { LedgerModule } from '../ledger/ledger.module';
import { JournalEntriesController } from './journal-entries.controller';
import { JournalEntriesService } from './journal-entries.service';

@Module({
  imports: [LedgerModule],
  controllers: [JournalEntriesController],
  providers: [JournalEntriesService],
  exports: [JournalEntriesService],
})
export class JournalEntriesModule {}
