import { Module } from '@nestjs/common';
import { GroupsModule } from '../../membresia/groups/groups.module';
import { LedgerModule } from '../ledger/ledger.module';
import { ApprovalsModule } from '../approvals/approvals.module';
import { DocumentSequencesModule } from '../../general/document-sequences/document-sequences.module';
import { GroupFundsController } from './group-funds.controller';
import { GroupFundsService } from './group-funds.service';

@Module({
  imports: [GroupsModule, LedgerModule, ApprovalsModule, DocumentSequencesModule],
  controllers: [GroupFundsController],
  providers: [GroupFundsService],
  exports: [GroupFundsService],
})
export class GroupFundsModule {}
