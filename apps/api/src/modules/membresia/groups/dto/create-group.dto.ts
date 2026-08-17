import { IsString, IsNotEmpty, IsOptional, IsUUID, MaxLength, IsBoolean } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { emptyToUndefined } from '../../../../common/utils/empty-to-undefined.transform';

export class CreateGroupDto {
  @ApiProperty({ example: 'uuid-de-la-institución' })
  @IsUUID()
  institutionId!: string;

  @ApiPropertyOptional({ description: 'Vacío = grupo de toda la institución, no de una sucursal en particular' })
  @IsUUID()
  @IsOptional()
  branchId?: string;

  @ApiProperty({ example: 'uuid-del-catalog-item (catalogCode=group_type)' })
  @IsUUID()
  groupTypeId!: string;

  @ApiProperty({ example: 'Célula Los Olivos' })
  @IsString() @IsNotEmpty() @MaxLength(150)
  name!: string;

  @ApiPropertyOptional()
  @Transform(emptyToUndefined)
  @IsString() @IsOptional()
  description?: string;

  @ApiPropertyOptional({ description: 'Persona líder del grupo, opcional' })
  @IsUUID()
  @IsOptional()
  leaderPersonId?: string;

  @ApiPropertyOptional()
  @IsBoolean() @IsOptional()
  isActive?: boolean;
}
