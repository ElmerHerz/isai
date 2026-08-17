import { Controller, Get, Post, Patch, Body, Param } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { LanguagesService } from './languages.service';
import { CreateLanguageDto } from './dto/create-language.dto';
import { UpdateLanguageDto } from './dto/update-language.dto';
import { RequirePermission } from '../../../common/decorators/require-permission.decorator';
import { SuperadminOnly } from '../../../common/decorators/superadmin-only.decorator';

@ApiTags('languages')
@ApiBearerAuth('access-token')
@Controller({ path: 'languages', version: '1' })
export class LanguagesController {
  constructor(private readonly languagesService: LanguagesService) {}

  // Reutiliza el permiso de instituciones (catálogo de solo lectura, sin
  // permiso propio seeded).
  @Get()
  @RequirePermission('core.institution.view')
  @ApiOperation({ summary: 'Catálogo de idiomas' })
  findAll() {
    return this.languagesService.findAll();
  }

  @Post()
  @SuperadminOnly()
  @ApiOperation({ summary: 'Crear idioma (solo superadmin)' })
  create(@Body() dto: CreateLanguageDto) {
    return this.languagesService.create(dto);
  }

  @Patch(':code')
  @SuperadminOnly()
  @ApiOperation({ summary: 'Actualizar idioma (solo superadmin)' })
  update(@Param('code') code: string, @Body() dto: UpdateLanguageDto) {
    return this.languagesService.update(code, dto);
  }
}
