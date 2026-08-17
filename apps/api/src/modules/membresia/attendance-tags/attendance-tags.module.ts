import { Module } from '@nestjs/common';
import { AttendanceTagsController } from './attendance-tags.controller';
import { AttendanceTagsService } from './attendance-tags.service';

@Module({
  controllers: [AttendanceTagsController],
  providers: [AttendanceTagsService],
  exports: [AttendanceTagsService],
})
export class AttendanceTagsModule {}
