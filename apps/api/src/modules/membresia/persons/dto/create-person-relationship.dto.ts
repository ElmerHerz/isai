import { IsUUID, IsOptional, IsString } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { emptyToUndefined } from '../../../../common/utils/empty-to-undefined.transform';

export class CreatePersonRelationshipDto {
  @ApiProperty({ example: 'uuid-de-la-persona-relacionada' })
  @IsUUID()
  relatedPersonId!: string;

  @ApiProperty({ example: 'uuid-del-catalog-item (catalogCode=relationship_type)' })
  @IsUUID()
  relationshipTypeId!: string;

  @ApiPropertyOptional()
  @Transform(emptyToUndefined)
  @IsString()
  @IsOptional()
  notes?: string;
}
