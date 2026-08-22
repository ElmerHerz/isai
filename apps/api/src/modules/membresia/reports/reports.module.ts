import { Module } from '@nestjs/common';
import { MembershipReportsController } from './reports.controller';
import { MembershipReportsService } from './reports.service';

@Module({
  controllers: [MembershipReportsController],
  providers: [MembershipReportsService],
  exports: [MembershipReportsService],
})
export class MembershipReportsModule {}
