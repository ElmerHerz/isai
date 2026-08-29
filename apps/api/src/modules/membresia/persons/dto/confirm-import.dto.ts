import { IsString, IsNotEmpty, IsOptional, IsUUID, MaxLength, IsArray, ValidateNested, ArrayMaxSize } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ImportRowDto {
  @ApiProperty({ example: 'María' })
  @IsString() @IsNotEmpty() @MaxLength(100)
  firstName!: string;

  @ApiProperty({ example: 'González' })
  @IsString() @IsNotEmpty() @MaxLength(100)
  lastName!: string;
}

export class ConfirmImportDto {
  @ApiProperty({ example: 'uuid-de-la-institución' })
  @IsUUID('loose')
  institutionId!: string;

  @ApiPropertyOptional()
  @IsUUID('loose')
  @IsOptional()
  branchId?: string;

  @ApiProperty({ example: 'uuid-del-catalog-item (catalogCode=person_type)' })
  @IsUUID('loose')
  personTypeId!: string;

  // Mismo tope que la previsualización — evita lotes fuera de cualquier
  // caso de uso real (ver PersonsService.MAX_IMPORT_ROWS).
  @ApiProperty({ type: [ImportRowDto] })
  @IsArray()
  @ArrayMaxSize(2000)
  @ValidateNested({ each: true })
  @Type(() => ImportRowDto)
  rows!: ImportRowDto[];
}
