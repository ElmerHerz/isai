import { IsUUID, IsOptional, IsString, IsDateString } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { emptyToUndefined } from '../../../../common/utils/empty-to-undefined.transform';

export class CreatePersonMilestoneDto {
  @ApiProperty({ example: 'uuid-del-tipo-de-hito' })
  @IsUUID('loose')
  milestoneTypeId!: string;

  @ApiProperty({ example: '2020-03-12' })
  @IsDateString()
  occurredOn!: string;

  @ApiPropertyOptional()
  @Transform(emptyToUndefined)
  @IsString()
  @IsOptional()
  notes?: string;
}
