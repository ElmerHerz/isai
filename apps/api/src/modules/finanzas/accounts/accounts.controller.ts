import { Controller, Get, Post, Body } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AccountsService } from './accounts.service';
import { CreateAccountDto } from './dto/create-account.dto';
import { RequirePermission } from '../../../common/decorators/require-permission.decorator';
import { CurrentTenant } from '../../../common/decorators/current-tenant.decorator';
import { CurrentUser, RequestUser } from '../../../common/decorators/current-user.decorator';

@ApiTags('finanzas-accounts')
@ApiBearerAuth('access-token')
@Controller({ path: 'accounts', version: '1' })
export class AccountsController {
  constructor(private readonly accountsService: AccountsService) {}

  @Get()
  @RequirePermission('finance.account.view')
  @ApiOperation({ summary: 'Catálogo de cuentas del tenant activo, con saldo actual (solo asientos posted)' })
  findAll(@CurrentTenant() tenantId: string | null, @CurrentUser() user: RequestUser) {
    return this.accountsService.findAll(tenantId, user);
  }

  @Post()
  @RequirePermission('finance.account.create')
  @ApiOperation({ summary: 'Crear una cuenta nueva en el tenant activo (siempre transaccionable)' })
  create(@Body() dto: CreateAccountDto, @CurrentTenant() tenantId: string | null) {
    return this.accountsService.create(tenantId, dto);
  }
}
