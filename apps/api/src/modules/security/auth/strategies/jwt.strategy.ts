import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { JwtPayload } from '../auth.service';

/**
 * JwtStrategy — Passport strategy que valida el Bearer JWT en cada request.
 *
 * Al validar exitosamente, coloca el payload en request.user, incluyendo:
 * - userId (sub)
 * - email
 * - tenantId  ← usado por @CurrentTenant() y TenantRlsInterceptor
 * - permissions ← usado por PermissionsGuard
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('JWT_SECRET'),
    });
  }

  validate(payload: JwtPayload) {
    // tenantId puede ser null (superadmin de la plataforma) — solo sub es obligatorio.
    if (!payload.sub) {
      throw new UnauthorizedException('Token inválido');
    }

    // Este objeto queda disponible como request.user en toda la cadena
    return {
      userId: payload.sub,
      email: payload.email,
      tenantId: payload.tenantId,
      permissions: payload.permissions,
      isSuperadmin: payload.isSuperadmin,
    };
  }
}
