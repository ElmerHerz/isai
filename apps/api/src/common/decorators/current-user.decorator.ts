import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Forma real de request.user, colocada ahí por JwtStrategy.validate()
 * (ver apps/api/src/modules/security/auth/strategies/jwt.strategy.ts).
 */
export interface RequestUser {
  userId: string;
  email: string;
  tenantId: string | null;
  permissions: string[];
  isSuperadmin: boolean;
}

/**
 * @CurrentUser() extrae el usuario completo del JWT autenticado.
 *
 * Uso en controller:
 * getProfile(@CurrentUser() user: RequestUser) { ... }
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): RequestUser => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
