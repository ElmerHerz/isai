import { Module } from '@nestjs/common';
import { DocumentSequencesService } from './document-sequences.service';

@Module({
  providers: [DocumentSequencesService],
  exports: [DocumentSequencesService],
})
export class DocumentSequencesModule {}
