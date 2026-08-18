import { Module } from '@nestjs/common';
import { GroupsModule } from '../../membresia/groups/groups.module';
import { GroupFundsController } from './group-funds.controller';
import { GroupFundsService } from './group-funds.service';

@Module({
  imports: [GroupsModule],
  controllers: [GroupFundsController],
  providers: [GroupFundsService],
  exports: [GroupFundsService],
})
export class GroupFundsModule {}
