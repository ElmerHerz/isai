import { Controller, Get, Post, Patch, Body, Param } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrenciesService } from './currencies.service';
import { CreateCurrencyDto } from './dto/create-currency.dto';
import { UpdateCurrencyDto } from './dto/update-currency.dto';
import { AnyAuthenticatedUser } from '../../../common/decorators/any-authenticated-user.decorator';
import { SuperadminOnly } from '../../../common/decorators/superadmin-only.decorator';

@ApiTags('currencies')
@ApiBearerAuth('access-token')
@Controller({ path: 'currencies', version: '1' })
export class CurrenciesController {
  constructor(private readonly currenciesService: CurrenciesService) {}

  // Catálogo genérico de referencia (monedas ISO), sin tenant_id propio —
  // mismo criterio que catalog-items/institutions en sesión: lectura sin
  // sensibilidad, no hace falta un permiso de negocio para verla.
  @Get()
  @AnyAuthenticatedUser()
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
