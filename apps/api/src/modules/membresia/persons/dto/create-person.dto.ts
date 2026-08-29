import {
  IsString, IsNotEmpty, IsOptional, IsUUID, IsEmail, IsDateString, MaxLength, IsBoolean,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { emptyToUndefined } from '../../../../common/utils/empty-to-undefined.transform';

export class CreatePersonDto {
  @ApiProperty({ example: 'uuid-de-la-institución' })
  @IsUUID('loose')
  institutionId!: string;

  @ApiPropertyOptional({ description: 'Vacío = persona de toda la institución, no de una sucursal en particular' })
  @IsUUID('loose')
  @IsOptional()
  branchId?: string;

  @ApiProperty({ example: 'uuid-del-catalog-item (catalogCode=person_type)' })
  @IsUUID('loose')
  personTypeId!: string;

  @ApiProperty({ example: 'María' })
  @IsString() @IsNotEmpty() @MaxLength(100)
  firstName!: string;

  @ApiProperty({ example: 'González' })
  @IsString() @IsNotEmpty() @MaxLength(100)
  lastName!: string;

  @ApiPropertyOptional({ example: '1990-05-20' })
  @Transform(emptyToUndefined)
  @IsDateString() @IsOptional()
  birthDate?: string;

  @ApiPropertyOptional({ example: 'F' })
  @Transform(emptyToUndefined)
  @IsString() @IsOptional() @MaxLength(20)
  gender?: string;

  @ApiPropertyOptional({ example: '+503 7000-0000' })
  @Transform(emptyToUndefined)
  @IsString() @IsOptional() @MaxLength(30)
  phone?: string;

  @ApiPropertyOptional({ example: 'maria@example.com' })
  @Transform(emptyToUndefined)
  @IsEmail() @IsOptional()
  email?: string;

  @ApiPropertyOptional({ example: '12345678-9' })
  @Transform(emptyToUndefined)
  @IsString() @IsOptional() @MaxLength(30)
  identityDocument?: string;

  @ApiPropertyOptional()
  @Transform(emptyToUndefined)
  @IsString() @IsOptional() @MaxLength(500)
  photoUrl?: string;

  @ApiPropertyOptional({ example: '5a avenida 10-25, zona 1' })
  @Transform(emptyToUndefined)
  @IsString() @IsOptional() @MaxLength(200)
  addressLine?: string;

  @ApiPropertyOptional({ example: 'San Salvador' })
  @Transform(emptyToUndefined)
  @IsString() @IsOptional() @MaxLength(100)
  city?: string;

  @ApiPropertyOptional({ example: '2020-01-15' })
  @Transform(emptyToUndefined)
  @IsDateString() @IsOptional()
  joinDate?: string;

  @ApiPropertyOptional()
  @IsBoolean() @IsOptional()
  isActive?: boolean;

  @ApiPropertyOptional()
  @Transform(emptyToUndefined)
  @IsString() @IsOptional()
  notes?: string;
}
