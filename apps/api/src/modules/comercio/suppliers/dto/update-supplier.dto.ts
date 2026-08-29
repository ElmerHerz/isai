import { IsString, IsOptional, IsEmail, IsBoolean, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

// null (no undefined) en los campos nullable para poder limpiarlos — mismo
// criterio corregido en UpdateProductDto tras el bug real de la Rebanada 2.
export class UpdateSupplierDto {
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
  @IsString() @IsOptional() @MaxLength(255)
  address?: string | null;

  @ApiPropertyOptional()
  @IsString() @IsOptional()
  notes?: string | null;

  @ApiPropertyOptional()
  @IsBoolean() @IsOptional()
  isActive?: boolean;
}
