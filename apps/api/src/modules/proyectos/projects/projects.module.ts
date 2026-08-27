import { Module } from '@nestjs/common';
import { LedgerModule } from '../../finanzas/ledger/ledger.module';
import { ProjectsController } from './projects.controller';
import { ProjectsService } from './projects.service';

@Module({
  imports: [LedgerModule],
  controllers: [ProjectsController],
  providers: [ProjectsService],
  exports: [ProjectsService],
})
export class ProjectsModule {}
