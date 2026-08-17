import { IsString, IsNotEmpty, IsOptional, IsUUID, IsDateString, MaxLength, Matches } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { emptyToUndefined } from '../../../../common/utils/empty-to-undefined.transform';

// startTime/endTime llegan como "HH:mm" o "HH:mm:ss" — el service las
// convierte a Date antes de escribir en la columna @db.Time (mismo patrón
// que branch-schedules).
const TIME_PATTERN = /^\d{2}:\d{2}(:\d{2})?$/;

export class CreateEventDto {
  @ApiProperty({ example: 'uuid-de-la-institución' })
  @IsUUID()
  institutionId!: string;

  @ApiPropertyOptional({ description: 'Vacío + groupId vacío = aplica a toda la institución' })
  @IsUUID()
  @IsOptional()
  branchId?: string;

  @ApiPropertyOptional({ description: 'Con valor = aplica solo a los miembros actuales de ese grupo (ignora branchId)' })
  @IsUUID()
  @IsOptional()
  groupId?: string;

  @ApiPropertyOptional({ description: 'Horario recurrente del que "nació" este evento, opcional' })
  @IsUUID()
  @IsOptional()
  scheduleId?: string;

  @ApiProperty({ example: 'uuid-del-catalog-item (catalogCode=schedule_type)' })
  @IsUUID()
  eventTypeId!: string;

  @ApiProperty({ example: 'Culto Dominical' })
  @IsString() @IsNotEmpty() @MaxLength(150)
  title!: string;

  @ApiProperty({ example: '2026-08-09' })
  @IsDateString()
  eventDate!: string;

  @ApiPropertyOptional({ example: '09:00' })
  @Transform(emptyToUndefined)
  @IsString() @IsOptional() @Matches(TIME_PATTERN, { message: 'startTime debe tener formato HH:mm' })
  startTime?: string;

  @ApiPropertyOptional({ example: '11:00' })
  @Transform(emptyToUndefined)
  @IsString() @IsOptional() @Matches(TIME_PATTERN, { message: 'endTime debe tener formato HH:mm' })
  endTime?: string;

  @ApiPropertyOptional()
  @Transform(emptyToUndefined)
  @IsString() @IsOptional()
  notes?: string;
}
