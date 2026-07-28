import { IsString, IsNotEmpty, MaxLength, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Regla: DTOs con sufijo explícito (CreateTenantDto, UpdateTenantDto...).
 * Nunca reutilizar un DTO genérico para múltiples operaciones.
 */
export class CreateTenantDto {
  @ApiProperty({ example: 'acme', description: 'Slug único del tenant' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  slug!: string;

  @ApiProperty({ example: 'ACME Corporation', description: 'Nombre del tenant' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  name!: string;

  @ApiPropertyOptional({ example: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
