import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
import { GeneralModule } from './modules/general/general.module';
import { SecurityModule } from './modules/security/security.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { PermissionsGuard } from './common/guards/permissions.guard';
import { TenantRlsInterceptor } from './common/interceptors/tenant-rls.interceptor';

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
    // Futuros módulos se agregan aquí: MembershipModule, FinanceModule, etc.
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

    // ─── Interceptors globales ────────────────────────────────────────────
    // Inyecta SET app.current_tenant_id en cada transacción (RLS de Postgres)
    {
      provide: APP_INTERCEPTOR,
      useClass: TenantRlsInterceptor,
    },
  ],
})
export class AppModule {}
