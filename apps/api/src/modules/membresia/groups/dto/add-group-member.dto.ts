import { IsString, IsOptional, IsUUID, IsDateString, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { emptyToUndefined } from '../../../../common/utils/empty-to-undefined.transform';

export class AddGroupMemberDto {
  @ApiProperty({ example: 'uuid-de-la-persona' })
  @IsUUID('loose')
  personId!: string;

  @ApiPropertyOptional({ example: 'leader', description: 'Texto libre — no hay catálogo todavía' })
  @Transform(emptyToUndefined)
  @IsString() @IsOptional() @MaxLength(50)
  role?: string;

  @ApiPropertyOptional({ example: '2026-01-15', description: 'Vacío = hoy' })
  @Transform(emptyToUndefined)
  @IsDateString() @IsOptional()
  joinedAt?: string;
}
