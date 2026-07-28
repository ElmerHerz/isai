import { PartialType } from '@nestjs/swagger';
import { CreateTenantDto } from './create-tenant.dto';

/**
 * UpdateTenantDto extiende de CreateTenantDto con todos los campos opcionales.
 * PartialType de @nestjs/swagger preserva los decoradores de Swagger automáticamente.
 */
export class UpdateTenantDto extends PartialType(CreateTenantDto) {}
