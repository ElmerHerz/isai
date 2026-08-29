import { Controller, Get, Post, Param, Query, Body, ParseUUIDPipe } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { PeriodClosingsService } from './period-closings.service';
import { CreatePeriodClosingDto } from './dto/create-period-closing.dto';
import { ReopenPeriodClosingDto } from './dto/reopen-period-closing.dto';
import { RequirePermission } from '../../../common/decorators/require-permission.decorator';
import { CurrentTenant } from '../../../common/decorators/current-tenant.decorator';
import { CurrentUser, RequestUser } from '../../../common/decorators/current-user.decorator';

@ApiTags('finanzas-period-closings')
@ApiBearerAuth('access-token')
@Controller({ path: 'period-closings', version: '1' })
export class PeriodClosingsController {
  constructor(private readonly periodClosingsService: PeriodClosingsService) {}

  @Get()
  @RequirePermission('finance.period_closing.view')
  @ApiQuery({ name: 'institutionId', required: true })
  @ApiOperation({ summary: 'Cierres de periodo de una institución, accesibles al usuario' })
  findAll(
    @Query('institutionId', ParseUUIDPipe) institutionId: string,
    @CurrentTenant() tenantId: string | null,
    @CurrentUser() user: RequestUser,
  ) {
    return this.periodClosingsService.findAll(institutionId, tenantId, user);
  }

  @Post()
  @RequirePermission('finance.period_closing.create')
  @ApiOperation({ summary: 'Cerrar un periodo: genera el asiento de cierre y bloquea contabilizar/anular hacia atrás' })
  close(@Body() dto: CreatePeriodClosingDto, @CurrentTenant() tenantId: string | null, @CurrentUser() user: RequestUser) {
    return this.periodClosingsService.close(tenantId, dto, user);
  }

  @Post(':id/reopen')
  @RequirePermission('finance.period_closing.reopen')
  @ApiOperation({ summary: 'Reabrir un periodo cerrado (solo superadmin)' })
  reopen(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReopenPeriodClosingDto,
    @CurrentTenant() tenantId: string | null,
    @CurrentUser() user: RequestUser,
  ) {
    return this.periodClosingsService.reopen(id, tenantId, dto, user);
  }
}
