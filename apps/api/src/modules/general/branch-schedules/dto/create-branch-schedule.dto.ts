import { IsString, IsUUID, IsInt, Min, Max, Matches, IsOptional, Length } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { emptyToUndefined } from '../../../../common/utils/empty-to-undefined.transform';

// startTime/endTime llegan como "HH:mm" o "HH:mm:ss" — el service las
// convierte a Date antes de escribir en la columna @db.Time.
const TIME_PATTERN = /^\d{2}:\d{2}(:\d{2})?$/;

export class CreateBranchScheduleDto {
  @ApiProperty({ description: 'Id del tipo de horario (catalog_items, catalogCode="schedule_type")' })
  @IsUUID()
  scheduleTypeId!: string;

  @ApiProperty({ example: 0, description: '0=domingo .. 6=sábado' })
  @IsInt() @Min(0) @Max(6)
  dayOfWeek!: number;

  @ApiProperty({ example: '10:00' })
  @IsString() @Matches(TIME_PATTERN, { message: 'startTime debe tener formato HH:mm' })
  startTime!: string;

  @ApiPropertyOptional({ example: '12:00' })
  @Transform(emptyToUndefined)
  @IsString() @IsOptional() @Matches(TIME_PATTERN, { message: 'endTime debe tener formato HH:mm' })
  endTime?: string;

  @ApiPropertyOptional({ example: 'Culto Dominical' })
  @Transform(emptyToUndefined)
  @IsString() @IsOptional() @Length(1, 150)
  label?: string;
}
