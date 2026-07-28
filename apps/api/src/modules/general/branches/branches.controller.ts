import {
  Controller, Get, Post, Patch, Param, Body, ParseUUIDPipe,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { BranchesService } from './branches.service';
import { CreateBranchDto } from './dto/create-branch.dto';
import { UpdateBranchDto } from './dto/update-branch.dto';
import { RequirePermission } from '../../../common/decorators/require-permission.decorator';
import { CurrentTenant } from '../../../common/decorators/current-tenant.decorator';

@ApiTags('branches')
@ApiBearerAuth('access-token')
@Controller({ path: 'institutions/:institutionId/branches', version: '1' })
export class BranchesController {
  constructor(private readonly branchesService: BranchesService) {}

  @Get()
  @RequirePermission('general.branch.read')
  @ApiOperation({ summary: 'Listar sucursales de una institución' })
  findAll(
    @Param('institutionId', ParseUUIDPipe) institutionId: string,
    @CurrentTenant() tenantId: string,
  ) {
    return this.branchesService.findAll(institutionId, tenantId);
  }

  @Get(':id')
  @RequirePermission('general.branch.read')
  findOne(
    @Param('institutionId', ParseUUIDPipe) institutionId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentTenant() tenantId: string,
  ) {
    return this.branchesService.findOne(id, institutionId, tenantId);
  }

  @Post()
  @RequirePermission('general.branch.create')
  create(
    @Param('institutionId', ParseUUIDPipe) institutionId: string,
    @Body() dto: CreateBranchDto,
    @CurrentTenant() tenantId: string,
  ) {
    return this.branchesService.create(institutionId, tenantId, dto);
  }

  @Patch(':id')
  @RequirePermission('general.branch.update')
  update(
    @Param('institutionId', ParseUUIDPipe) institutionId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateBranchDto,
    @CurrentTenant() tenantId: string,
  ) {
    return this.branchesService.update(id, institutionId, tenantId, dto);
  }
}
