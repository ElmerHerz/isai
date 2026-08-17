import { IsUUID, IsOptional, IsDateString } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { emptyToUndefined } from '../../../../common/utils/empty-to-undefined.transform';

export class CreateGroupPositionDto {
  @ApiProperty({ example: 'uuid-del-grupo' })
  @IsUUID()
  groupId!: string;

  @ApiProperty({ example: 'uuid-de-la-persona' })
  @IsUUID()
  personId!: string;

  @ApiProperty({ example: 'uuid-del-catalog-item (catalogCode=board_position)' })
  @IsUUID()
  positionId!: string;

  @ApiPropertyOptional({ example: '2026-01-15', description: 'Vacío = hoy' })
  @Transform(emptyToUndefined)
  @IsDateString() @IsOptional()
  termStart?: string;

  @ApiPropertyOptional({ example: '2028-01-15', description: 'Vacío = cargo vigente, sin fecha de fin' })
  @Transform(emptyToUndefined)
  @IsDateString() @IsOptional()
  termEnd?: string;
}
