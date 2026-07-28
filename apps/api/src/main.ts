import { NestFactory } from '@nestjs/core';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({ logger: process.env.NODE_ENV !== 'production' }),
  );

  // ─── Prefijo global y versionado ───────────────────────────────────────────
  app.setGlobalPrefix('api');
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });

  // ─── Validación global ─────────────────────────────────────────────────────
  // Todos los DTOs se validan automáticamente con class-validator
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,       // Strip propiedades no declaradas en el DTO
      forbidNonWhitelisted: true, // Rechaza requests con propiedades extra
      transform: true,       // Auto-convierte tipos (string → number, etc.)
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // ─── CORS ─────────────────────────────────────────────────────────────────
  app.enableCors({
    origin: process.env.CORS_ORIGIN ?? 'http://localhost:5173',
    credentials: true,
  });

  // ─── Swagger / OpenAPI ────────────────────────────────────────────────────
  if (process.env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('ISAI API')
      .setDescription(
        'API del Sistema de Administración Integral ISAI.\n\n' +
        'Todos los endpoints (salvo los marcados con @Public()) requieren JWT.',
      )
      .setVersion('1.0')
      .addBearerAuth(
        { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
        'access-token',
      )
      .addTag('auth', 'Autenticación y autorización')
      .addTag('tenants', 'Gestión de tenants')
      .addTag('institutions', 'Instituciones por tenant')
      .addTag('branches', 'Sucursales por institución')
      .addTag('users', 'Usuarios')
      .addTag('roles', 'Roles y permisos')
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document, {
      swaggerOptions: { persistAuthorization: true },
    });
  }

  const port = parseInt(process.env.PORT ?? '3000', 10);
  await app.listen(port, '0.0.0.0');

  console.log(`\n🚀 ISAI API corriendo en: http://localhost:${port}/api/v1`);
  if (process.env.NODE_ENV !== 'production') {
    console.log(`📚 Swagger docs:         http://localhost:${port}/api/docs`);
  }
}

bootstrap();
