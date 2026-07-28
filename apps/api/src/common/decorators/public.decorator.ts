import { SetMetadata } from '@nestjs/common';

/**
 * IS_PUBLIC_KEY es leída por JwtAuthGuard para saltarse la verificación JWT.
 *
 * Regla: Un endpoint marcado con @Public() es explícitamente público.
 * Nunca se hace un endpoint público por omisión (sin el decorador).
 *
 * Uso:
 * @Public()
 * @Post('login')
 * login(@Body() dto: LoginDto) { ... }
 */
export const IS_PUBLIC_KEY = 'is_public';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
