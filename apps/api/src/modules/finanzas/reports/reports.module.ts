import { Module } from '@nestjs/common';
import { DocumentSequencesModule } from '../../general/document-sequences/document-sequences.module';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';

@Module({
  imports: [DocumentSequencesModule],
  controllers: [ReportsController],
  providers: [ReportsService],
})
export class ReportsModule {}
