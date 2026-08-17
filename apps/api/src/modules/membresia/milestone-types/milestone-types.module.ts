import { Module } from '@nestjs/common';
import { MilestoneTypesController } from './milestone-types.controller';
import { MilestoneTypesService } from './milestone-types.service';

@Module({
  controllers: [MilestoneTypesController],
  providers: [MilestoneTypesService],
  exports: [MilestoneTypesService],
})
export class MilestoneTypesModule {}
