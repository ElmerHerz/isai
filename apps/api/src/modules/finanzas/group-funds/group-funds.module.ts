import { Module } from '@nestjs/common';
import { GroupsModule } from '../../membresia/groups/groups.module';
import { LedgerModule } from '../ledger/ledger.module';
import { GroupFundsController } from './group-funds.controller';
import { GroupFundsService } from './group-funds.service';

@Module({
  imports: [GroupsModule, LedgerModule],
  controllers: [GroupFundsController],
  providers: [GroupFundsService],
  exports: [GroupFundsService],
})
export class GroupFundsModule {}
