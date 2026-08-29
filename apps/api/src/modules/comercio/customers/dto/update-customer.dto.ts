import { IsString, IsOptional, IsEmail, IsBoolean, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

// null (no undefined) en los campos nullable para poder limpiarlos — mismo
// criterio que UpdateSupplierDto.
export class UpdateCustomerDto {
  @ApiPropertyOptional()
  @IsString() @IsOptional() @MaxLength(150)
  name?: string;

  @ApiPropertyOptional()
  @IsString() @IsOptional() @MaxLength(30)
  taxId?: string | null;

  @ApiPropertyOptional()
  @IsString() @IsOptional() @MaxLength(30)
  phone?: string | null;

  @ApiPropertyOptional()
  @IsEmail() @IsOptional()
  email?: string | null;

  @ApiPropertyOptional()
  @IsString() @IsOptional()
  notes?: string | null;

  @ApiPropertyOptional()
  @IsBoolean() @IsOptional()
  isActive?: boolean;
}
