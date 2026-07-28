import { Module } from '@nestjs/common';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { RolesModule } from './roles/roles.module';

/**
 * SecurityModule — Schema "seguridad" de Postgres
 *
 * Contiene los recursos de autenticación y autorización:
 * - Auth (login, refresh tokens, logout)
 * - Users (gestión de usuarios del tenant)
 * - Roles (roles y permisos)
 *
 * Regla: Este módulo es el único que accede al schema "seguridad" de Prisma.
 */
@Module({
  imports: [
    PrismaModule,
    AuthModule,
    UsersModule,
    RolesModule,
  ],
  exports: [
    UsersModule,
    RolesModule,
  ],
})
export class SecurityModule {}
