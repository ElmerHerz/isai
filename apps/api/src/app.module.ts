import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
import { GeneralModule } from './modules/general/general.module';
import { SecurityModule } from './modules/security/security.module';
import { MembresiaModule } from './modules/membresia/membresia.module';
import { FinanzasModule } from './modules/finanzas/finanzas.module';
import { ProyectosModule } from './modules/proyectos/proyectos.module';
import { InventarioModule } from './modules/inventario/inventario.module';
import { ComercioModule } from './modules/comercio/comercio.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { PermissionsGuard } from './common/guards/permissions.guard';
import { MustChangePasswordGuard } from './common/guards/must-change-password.guard';
import { ScopeGuard } from './common/guards/scope.guard';
import { TenantRlsInterceptor } from './common/interceptors/tenant-rls.interceptor';
import { AuditLogInterceptor } from './common/interceptors/audit-log.interceptor';

@Module({
  imports: [
    // ─── Configuración global ─────────────────────────────────────────────
    // .env cargado una sola vez aquí; accesible en toda la app via ConfigService
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    // ─── Rate limiting ────────────────────────────────────────────────────
    ThrottlerModule.forRoot([
      {
        ttl: 60_000, // ventana de 60 segundos
        limit: 100,  // máximo 100 requests por IP en la ventana
      },
    ]),

    // ─── Módulos de negocio ───────────────────────────────────────────────
    // Regla: Un módulo de NestJS = un schema de Postgres = una carpeta en modules/
    GeneralModule,
    SecurityModule,
    MembresiaModule,
    FinanzasModule,
    ProyectosModule,
    InventarioModule,
    ComercioModule,
  ],

  providers: [
    // ─── Guards globales ──────────────────────────────────────────────────
    // Regla: TODOS los endpoints requieren JWT + permisos salvo @Public()
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: PermissionsGuard,
    },
    // Bloquea todo excepto los endpoints @AllowWhileMustChangePassword()
    // (cambiar contraseña, /auth/me, logout) mientras el usuario tenga
    // una contraseña temporal pendiente de cambiar.
    {
      provide: APP_GUARD,
      useClass: MustChangePasswordGuard,
    },
    // Afirma acceso a institución/sucursal cuando el handler declara
    // @RequireScope() — no-op para todo lo que no lo use.
    {
      provide: APP_GUARD,
      useClass: ScopeGuard,
    },

    // ─── Interceptors globales ────────────────────────────────────────────
    // Inyecta SET app.current_tenant_id en cada transacción (RLS de Postgres)
    {
      provide: APP_INTERCEPTOR,
      useClass: TenantRlsInterceptor,
    },
    // Registra cada mutación exitosa (POST/PUT/PATCH/DELETE) en
    // seguridad.audit_logs — ver el propio interceptor para el detalle.
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditLogInterceptor,
    },
  ],
})
export class AppModule {}
