import { Module } from '@nestjs/common';
import { BranchSchedulesController } from './branch-schedules.controller';
import { BranchSchedulesService } from './branch-schedules.service';

@Module({
  controllers: [BranchSchedulesController],
  providers: [BranchSchedulesService],
})
export class BranchSchedulesModule {}
