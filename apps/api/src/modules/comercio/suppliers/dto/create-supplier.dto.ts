import { IsString, IsNotEmpty, IsOptional, IsEmail, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { emptyToUndefined } from '../../../../common/utils/empty-to-undefined.transform';

export class CreateSupplierDto {
  @ApiProperty({ example: 'Distribuidora El Salvador' })
  @IsString() @IsNotEmpty() @MaxLength(150)
  name!: string;

  @ApiPropertyOptional()
  @Transform(emptyToUndefined)
  @IsString() @IsOptional() @MaxLength(30)
  taxId?: string;

  @ApiPropertyOptional()
  @Transform(emptyToUndefined)
  @IsString() @IsOptional() @MaxLength(30)
  phone?: string;

  @ApiPropertyOptional()
  @Transform(emptyToUndefined)
  @IsEmail() @IsOptional()
  email?: string;

  @ApiPropertyOptional()
  @Transform(emptyToUndefined)
  @IsString() @IsOptional() @MaxLength(255)
  address?: string;

  @ApiPropertyOptional()
  @Transform(emptyToUndefined)
  @IsString() @IsOptional()
  notes?: string;
}
