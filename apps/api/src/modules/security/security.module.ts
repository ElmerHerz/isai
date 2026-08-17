import { Module } from '@nestjs/common';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { RolesModule } from './roles/roles.module';
import { PermissionsModule } from './permissions/permissions.module';
import { AuditModule } from './audit/audit.module';

/**
 * SecurityModule — Schema "seguridad" de Postgres
 *
 * Contiene los recursos de autenticación y autorización:
 * - Auth (login, refresh tokens, logout)
 * - Users (gestión de usuarios del tenant)
 * - Roles (roles y permisos)
 * - Permissions (catálogo de solo lectura)
 * - Audit (lectura de audit_logs — la escritura la hace AuditLogInterceptor,
 *   global, en apps/api/src/common/interceptors/)
 *
 * Regla: Este módulo es el único que accede al schema "seguridad" de Prisma.
 */
@Module({
  imports: [
    PrismaModule,
    AuthModule,
    UsersModule,
    RolesModule,
    PermissionsModule,
    AuditModule,
  ],
  exports: [
    UsersModule,
    RolesModule,
    PermissionsModule,
  ],
})
export class SecurityModule {}
