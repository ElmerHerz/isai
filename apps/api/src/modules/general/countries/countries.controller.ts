import { Controller, Get, Post, Patch, Body, Param } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CountriesService } from './countries.service';
import { CreateCountryDto } from './dto/create-country.dto';
import { UpdateCountryDto } from './dto/update-country.dto';
import { RequirePermission } from '../../../common/decorators/require-permission.decorator';
import { SuperadminOnly } from '../../../common/decorators/superadmin-only.decorator';

@ApiTags('countries')
@ApiBearerAuth('access-token')
@Controller({ path: 'countries', version: '1' })
export class CountriesController {
  constructor(private readonly countriesService: CountriesService) {}

  // Reutiliza el permiso de instituciones (catálogo de solo lectura, sin
  // permiso propio seeded).
  @Get()
  @RequirePermission('core.institution.view')
  @ApiOperation({ summary: 'Catálogo de países' })
  findAll() {
    return this.countriesService.findAll();
  }

  @Post()
  @SuperadminOnly()
  @ApiOperation({ summary: 'Crear país (solo superadmin)' })
  create(@Body() dto: CreateCountryDto) {
    return this.countriesService.create(dto);
  }

  @Patch(':code')
  @SuperadminOnly()
  @ApiOperation({ summary: 'Actualizar país (solo superadmin)' })
  update(@Param('code') code: string, @Body() dto: UpdateCountryDto) {
    return this.countriesService.update(code, dto);
  }
}
