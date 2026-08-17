import { IsArray, IsUUID, IsOptional, IsString, ValidateNested, ArrayMaxSize } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { emptyToUndefined } from '../../../../common/utils/empty-to-undefined.transform';

export class AttendanceRecordDto {
  @ApiProperty({ example: 'uuid-de-la-persona' })
  @IsUUID()
  personId!: string;

  @ApiProperty({ example: 'uuid-del-catalog-item (catalogCode=attendance_status)' })
  @IsUUID()
  statusId!: string;

  @ApiPropertyOptional()
  @Transform(emptyToUndefined)
  @IsString() @IsOptional()
  notes?: string;

  // Códigos del catálogo attendance_tag (ej. "UNIFORME", "MATERIAL") — nunca
  // texto libre del usuario final, ver la advertencia de esquema-libre en
  // docs/membresia-diseno.md sección 3. El service valida que cada código
  // exista de verdad en ese catálogo antes de guardarlo.
  @ApiPropertyOptional({ type: [String], example: ['UNIFORME'] })
  @IsArray() @IsOptional() @IsString({ each: true })
  tags?: string[];
}

export class RecordAttendanceDto {
  @ApiProperty({ type: [AttendanceRecordDto] })
  @IsArray()
  @ArrayMaxSize(2000)
  @ValidateNested({ each: true })
  @Type(() => AttendanceRecordDto)
  records!: AttendanceRecordDto[];
}
