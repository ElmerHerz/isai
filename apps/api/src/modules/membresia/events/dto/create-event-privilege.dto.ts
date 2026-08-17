import { IsUUID, IsOptional, IsString } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { emptyToUndefined } from '../../../../common/utils/empty-to-undefined.transform';

export class CreateEventPrivilegeDto {
  @ApiProperty({ example: 'uuid-de-la-persona' })
  @IsUUID()
  personId!: string;

  @ApiProperty({ example: 'uuid-del-tipo-de-privilegio' })
  @IsUUID()
  privilegeTypeId!: string;

  @ApiPropertyOptional()
  @Transform(emptyToUndefined)
  @IsString()
  @IsOptional()
  notes?: string;
}
