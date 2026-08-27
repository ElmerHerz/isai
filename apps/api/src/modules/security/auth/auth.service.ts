import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'node:crypto';
import * as bcrypt from 'bcryptjs';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { LoginDto } from './dto/login.dto';

export interface JwtPayload {
  sub: string;       // userId
  email: string;
  tenantId: string | null; // null = superadmin de la plataforma (sin tenant)
  permissions: string[];
  isSuperadmin: boolean; // true = tiene el rol de sistema "superadmin" (acceso total, bypass de permisos)
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

// Incluye lo necesario para calcular permisos efectivos + isSuperadmin —
// compartido entre login() (busca por email) y refresh() (busca por id) para
// que ambos emitan tokens con exactamente la misma lógica.
const userRolesInclude = {
  userRoles: {
    include: {
      role: {
        include: { rolePermissions: { include: { permission: true } } },
      },
    },
  },
};

type UserWithRoles = Prisma.UserGetPayload<{ include: typeof userRolesInclude }>;

/**
 * AuthService — Lógica de autenticación.
 *
 * Regla: No accede a req/res — recibe solo los datos que necesita.
 * Los permisos efectivos se calculan aquí y van embebidos en el JWT (no hay
 * caché de Redis en este flujo, el JWT mismo hace ese papel).
 */
@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  async login(dto: LoginDto): Promise<AuthTokens> {
    // email es único GLOBALMENTE (constraint uq_users_email, no solo por
    // tenant) — findUnique en vez de findFirst: antes, con la constraint
    // vieja (única solo por tenant), dos tenants podían compartir un email y
    // findFirst devolvía una fila no determinista, arriesgando autenticar a
    // alguien con el tenant equivocado. Ver auditoría de sesión.
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email, isActive: true },
      include: userRolesInclude,
    });

    if (!user) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const passwordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordValid) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const tokens = await this.issueTokens(user);

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    return tokens;
  }

  async refresh(refreshToken: string): Promise<AuthTokens> {
    let payload: { sub: string };
    try {
      payload = this.jwtService.verify<{ sub: string }>(refreshToken, {
        secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Refresh token inválido o expirado');
    }

    const stored = await this.prisma.refreshToken.findFirst({
      where: { userId: payload.sub, tokenHash: this.hashToken(refreshToken) },
    });

    if (!stored || stored.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token inválido o expirado');
    }

    if (stored.revokedAt) {
      // Reuso de un refresh token ya rotado: señal de token robado — se
      // revoca toda la familia de tokens activos del usuario en vez de solo
      // rechazar este, forzando un login nuevo en todos los dispositivos.
      await this.prisma.refreshToken.updateMany({
        where: { userId: payload.sub, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      throw new UnauthorizedException('Refresh token inválido o expirado');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub, isActive: true },
      include: userRolesInclude,
    });
    if (!user) throw new UnauthorizedException();

    // Rotación: el token usado queda revokedAt + replacedBy apuntando al
    // nuevo (ver stored.id abajo), nunca se reutiliza dos veces.
    return this.issueTokens(user, stored.id);
  }

  // Trae también el arreglo plano de permisos efectivos (mismo cálculo que
  // issueTokens, que es lo que de verdad manda en el backend vía
  // PermissionsGuard) — el frontend lo necesita para poder ocultar UI que de
  // otro modo dispara un 403 solo por renderizarse (ver GroupFundsController:
  // la card "Fondo del grupo" en la página de un grupo se le mostraba a
  // CUALQUIER rol, incluido uno sin ningún permiso de finanzas).
  async me(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        tenantId: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        avatarUrl: true,
        locale: true,
        timezone: true,
        isActive: true,
        emailVerifiedAt: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
        userRoles: {
          include: { role: { include: { rolePermissions: { include: { permission: true } } } } },
        },
      },
    });

    if (!user) throw new UnauthorizedException();

    const { userRoles, ...rest } = user;
    const permissions = [
      ...new Set(userRoles.flatMap((ur) => ur.role.rolePermissions.map((rp) => rp.permission.code))),
    ];
    return { ...rest, roles: userRoles.map((ur) => ur.role.name), permissions };
  }

  async logout(userId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  // Calcula permisos efectivos + isSuperadmin, firma el par de tokens, y
  // persiste el hash del refresh token (nunca el token en claro) en
  // RefreshToken para que refresh() pueda validarlo y logout()/reuso puedan
  // revocarlo. replacesTokenId, si viene, marca la rotación del token viejo.
  private async issueTokens(user: UserWithRoles, replacesTokenId?: string): Promise<AuthTokens> {
    const permissions = [
      ...new Set(
        user.userRoles.flatMap((ur) =>
          ur.role.rolePermissions.map((rp) => rp.permission.code),
        ),
      ),
    ];

    const isSuperadmin = user.userRoles.some(
      (ur) => ur.role.code === 'superadmin' && ur.role.isSystem,
    );

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      tenantId: user.tenantId,
      permissions,
      isSuperadmin,
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload),
      this.jwtService.signAsync(
        { sub: user.id },
        {
          secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET'),
          expiresIn: this.config.get<string>('JWT_REFRESH_EXPIRES_IN', '30m'),
        },
      ),
    ]);

    const decoded = this.jwtService.decode(refreshToken) as { exp: number };
    const stored = await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: this.hashToken(refreshToken),
        expiresAt: new Date(decoded.exp * 1000),
      },
    });

    if (replacesTokenId) {
      await this.prisma.refreshToken.update({
        where: { id: replacesTokenId },
        data: { revokedAt: new Date(), replacedBy: stored.id },
      });
    }

    return {
      accessToken,
      refreshToken,
      expiresIn: 900, // 15 minutos en segundos
    };
  }

  // sha256, no bcrypt: el refresh token ya es de alta entropía (un JWT
  // firmado), no una contraseña de baja entropía — bcrypt además trunca su
  // entrada a 72 bytes, más corto que un JWT típico. Un hash rápido con
  // búsqueda exacta es lo correcto aquí.
  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}
