import { Controller, Get, Post, Patch, Body, Param } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrenciesService } from './currencies.service';
import { CreateCurrencyDto } from './dto/create-currency.dto';
import { UpdateCurrencyDto } from './dto/update-currency.dto';
import { RequirePermission } from '../../../common/decorators/require-permission.decorator';
import { SuperadminOnly } from '../../../common/decorators/superadmin-only.decorator';

@ApiTags('currencies')
@ApiBearerAuth('access-token')
@Controller({ path: 'currencies', version: '1' })
export class CurrenciesController {
  constructor(private readonly currenciesService: CurrenciesService) {}

  // Reutiliza el permiso de instituciones (catálogo de solo lectura, sin
  // permiso propio seeded).
  @Get()
  @RequirePermission('core.institution.view')
  @ApiOperation({ summary: 'Catálogo de monedas' })
  findAll() {
    return this.currenciesService.findAll();
  }

  @Post()
  @SuperadminOnly()
  @ApiOperation({ summary: 'Crear moneda (solo superadmin)' })
  create(@Body() dto: CreateCurrencyDto) {
    return this.currenciesService.create(dto);
  }

  @Patch(':code')
  @SuperadminOnly()
  @ApiOperation({ summary: 'Actualizar moneda (solo superadmin)' })
  update(@Param('code') code: string, @Body() dto: UpdateCurrencyDto) {
    return this.currenciesService.update(code, dto);
  }
}
