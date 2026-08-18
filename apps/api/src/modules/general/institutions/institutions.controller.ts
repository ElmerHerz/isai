import {
  Controller, Get, Post, Patch, Param, Body, ParseUUIDPipe,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { InstitutionsService } from './institutions.service';
import { CreateInstitutionDto } from './dto/create-institution.dto';
import { UpdateInstitutionDto } from './dto/update-institution.dto';
import { RequirePermission } from '../../../common/decorators/require-permission.decorator';
import { AnyAuthenticatedUser } from '../../../common/decorators/any-authenticated-user.decorator';
import { CurrentTenant } from '../../../common/decorators/current-tenant.decorator';
import { CurrentUser, RequestUser } from '../../../common/decorators/current-user.decorator';

@ApiTags('institutions')
@ApiBearerAuth('access-token')
@Controller({ path: 'institutions', version: '1' })
export class InstitutionsController {
  constructor(private readonly institutionsService: InstitutionsService) {}

  // Lectura, no administración — InstitutionsService.findAll/findOne YA
  // filtran por resolveInstitutionScope(user) internamente, así que nunca
  // devuelven nada fuera del alcance real del usuario, sin importar este
  // decorador. core.institution.view seguía exigiéndose acá porque este
  // endpoint nació para la pantalla de administración de instituciones,
  // pero terminó siendo también el que usan Grupos/Personas/Eventos/
  // Proyectos/etc. solo para saber "en qué institución trabajo" — un rol
  // angosto (ej. Tesorero) legítimamente necesita eso sin ser administrador
  // de instituciones. Mismo criterio que el fix de catalog-items en sesión.
  @Get()
  @AnyAuthenticatedUser()
  @ApiOperation({ summary: 'Listar instituciones accesibles para el usuario actual' })
  findAll(
    @CurrentTenant() tenantId: string | null,
    @CurrentUser() user: RequestUser,
  ) {
    return this.institutionsService.findAll(tenantId, user);
  }

  @Get(':id')
  @AnyAuthenticatedUser()
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentTenant() tenantId: string | null,
    @CurrentUser() user: RequestUser,
  ) {
    return this.institutionsService.findOne(id, tenantId, user);
  }

  @Post()
  @RequirePermission('core.institution.create')
  create(
    @Body() dto: CreateInstitutionDto,
    @CurrentTenant() tenantId: string | null,
  ) {
    return this.institutionsService.create(tenantId, dto);
  }

  @Patch(':id')
  @RequirePermission('core.institution.update')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateInstitutionDto,
    @CurrentTenant() tenantId: string | null,
    @CurrentUser() user: RequestUser,
  ) {
    return this.institutionsService.update(id, tenantId, dto, user);
  }
}
