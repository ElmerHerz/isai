import { Module } from '@nestjs/common';
import { LedgerModule } from '../../finanzas/ledger/ledger.module';
import { ApprovalsModule } from '../../finanzas/approvals/approvals.module';
import { DocumentSequencesModule } from '../../general/document-sequences/document-sequences.module';
import { ProjectsController } from './projects.controller';
import { ProjectsService } from './projects.service';

@Module({
  imports: [LedgerModule, ApprovalsModule, DocumentSequencesModule],
  controllers: [ProjectsController],
  providers: [ProjectsService],
  exports: [ProjectsService],
})
export class ProjectsModule {}
