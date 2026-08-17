import {
  Controller, Get, Post, Patch, Param, Body, ParseUUIDPipe,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { InstitutionsService } from './institutions.service';
import { CreateInstitutionDto } from './dto/create-institution.dto';
import { UpdateInstitutionDto } from './dto/update-institution.dto';
import { RequirePermission } from '../../../common/decorators/require-permission.decorator';
import { CurrentTenant } from '../../../common/decorators/current-tenant.decorator';
import { CurrentUser, RequestUser } from '../../../common/decorators/current-user.decorator';

@ApiTags('institutions')
@ApiBearerAuth('access-token')
@Controller({ path: 'institutions', version: '1' })
export class InstitutionsController {
  constructor(private readonly institutionsService: InstitutionsService) {}

  @Get()
  @RequirePermission('core.institution.view')
  @ApiOperation({ summary: 'Listar instituciones del tenant activo' })
  findAll(
    @CurrentTenant() tenantId: string | null,
    @CurrentUser() user: RequestUser,
  ) {
    return this.institutionsService.findAll(tenantId, user);
  }

  @Get(':id')
  @RequirePermission('core.institution.view')
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
