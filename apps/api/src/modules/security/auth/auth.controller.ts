import { Controller, Post, Body, HttpCode, HttpStatus, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { Public } from '../../../common/decorators/public.decorator';
import { AnyAuthenticatedUser } from '../../../common/decorators/any-authenticated-user.decorator';
import { AllowWhileMustChangePassword } from '../../../common/decorators/allow-while-must-change-password.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';

@ApiTags('auth')
@Controller({ path: 'auth', version: '1' })
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * Endpoint público: no requiere JWT ni @RequirePermission.
   * Se marca EXPLÍCITAMENTE con @Public().
   */
  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Iniciar sesión (obtener JWT)' })
  login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Renovar access token con refresh token' })
  refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refresh(dto.refreshToken);
  }

  @ApiBearerAuth('access-token')
  @AnyAuthenticatedUser()
  @AllowWhileMustChangePassword()
  @Get('me')
  @ApiOperation({ summary: 'Obtener perfil del usuario autenticado' })
  me(@CurrentUser() user: { userId: string }) {
    return this.authService.me(user.userId);
  }

  @ApiBearerAuth('access-token')
  @AnyAuthenticatedUser()
  @AllowWhileMustChangePassword()
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Cerrar sesión (invalida refresh token)' })
  logout(@CurrentUser() user: { userId: string }) {
    return this.authService.logout(user.userId);
  }

  @ApiBearerAuth('access-token')
  @AnyAuthenticatedUser()
  @AllowWhileMustChangePassword()
  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cambiar la propia contraseña (requiere la actual) — limpia mustChangePassword' })
  changePassword(@Body() dto: ChangePasswordDto, @CurrentUser() user: { userId: string }) {
    return this.authService.changePassword(user.userId, dto);
  }
}
