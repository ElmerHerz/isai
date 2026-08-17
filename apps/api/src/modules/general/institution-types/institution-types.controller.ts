import { Controller, Get, Post, Patch, Body, Param } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { InstitutionTypesService } from './institution-types.service';
import { CreateInstitutionTypeDto } from './dto/create-institution-type.dto';
import { UpdateInstitutionTypeDto } from './dto/update-institution-type.dto';
import { RequirePermission } from '../../../common/decorators/require-permission.decorator';
import { SuperadminOnly } from '../../../common/decorators/superadmin-only.decorator';

@ApiTags('institution-types')
@ApiBearerAuth('access-token')
@Controller({ path: 'institution-types', version: '1' })
export class InstitutionTypesController {
  constructor(private readonly institutionTypesService: InstitutionTypesService) {}

  // Reutiliza el permiso de instituciones (catálogo de solo lectura, no
  // amerita un permiso propio) — quien puede ver instituciones necesita este
  // catálogo para el selector de tipo al crear una.
  @Get()
  @RequirePermission('core.institution.view')
  @ApiOperation({ summary: 'Catálogo de tipos de institución' })
  findAll() {
    return this.institutionTypesService.findAll();
  }

  @Post()
  @SuperadminOnly()
  @ApiOperation({ summary: 'Crear tipo de institución (solo superadmin)' })
  create(@Body() dto: CreateInstitutionTypeDto) {
    return this.institutionTypesService.create(dto);
  }

  @Patch(':code')
  @SuperadminOnly()
  @ApiOperation({ summary: 'Actualizar tipo de institución (solo superadmin)' })
  update(@Param('code') code: string, @Body() dto: UpdateInstitutionTypeDto) {
    return this.institutionTypesService.update(code, dto);
  }
}
