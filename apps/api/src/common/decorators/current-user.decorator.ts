import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * @CurrentUser() extrae el usuario completo del JWT autenticado.
 *
 * Uso en controller:
 * getProfile(@CurrentUser() user: JwtPayload) { ... }
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
