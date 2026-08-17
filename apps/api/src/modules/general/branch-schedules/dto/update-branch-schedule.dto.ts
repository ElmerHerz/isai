import { PartialType } from '@nestjs/swagger';
import { CreateBranchScheduleDto } from './create-branch-schedule.dto';

export class UpdateBranchScheduleDto extends PartialType(CreateBranchScheduleDto) {}
