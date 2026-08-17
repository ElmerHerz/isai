import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { MenusService } from './menus.service';
import { CurrentTenant } from '../../../common/decorators/current-tenant.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { AnyAuthenticatedUser } from '../../../common/decorators/any-authenticated-user.decorator';

@ApiTags('menus')
@ApiBearerAuth('access-token')
@Controller({ path: 'menus', version: '1' })
export class MenusController {
  constructor(private readonly menusService: MenusService) {}

  /**
   * Endpoint de autoservicio ("qué puedo ver yo") — mismo precedente que
   * GET /auth/me.
   */
  @AnyAuthenticatedUser()
  @Get('me')
  @ApiOperation({ summary: 'Menú de navegación efectivo del usuario autenticado' })
  findMyMenu(
    @CurrentTenant() tenantId: string | null,
    @CurrentUser() user: { permissions: string[]; isSuperadmin: boolean },
  ) {
    return this.menusService.findMyMenu(tenantId, user.permissions ?? [], user.isSuperadmin);
  }
}
