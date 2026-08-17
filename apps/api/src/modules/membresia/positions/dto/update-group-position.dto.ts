import { PartialType } from '@nestjs/swagger';
import { CreateGroupPositionDto } from './create-group-position.dto';

export class UpdateGroupPositionDto extends PartialType(CreateGroupPositionDto) {}
