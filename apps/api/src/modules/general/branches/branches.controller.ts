import {
  Controller, Get, Post, Patch, Param, Body, ParseUUIDPipe,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { BranchesService } from './branches.service';
import { CreateBranchDto } from './dto/create-branch.dto';
import { UpdateBranchDto } from './dto/update-branch.dto';
import { RequirePermission } from '../../../common/decorators/require-permission.decorator';
import { RequireScope } from '../../../common/decorators/require-scope.decorator';
import { CurrentTenant } from '../../../common/decorators/current-tenant.decorator';
import { CurrentUser, RequestUser } from '../../../common/decorators/current-user.decorator';

@ApiTags('branches')
@ApiBearerAuth('access-token')
@Controller({ path: 'institutions/:institutionId/branches', version: '1' })
export class BranchesController {
  constructor(private readonly branchesService: BranchesService) {}

  @Get()
  @RequirePermission('core.branch.view')
  @RequireScope({ level: 'institution', institutionIdParam: 'institutionId' })
  @ApiOperation({ summary: 'Listar sucursales de una institución' })
  findAll(
    @Param('institutionId', ParseUUIDPipe) institutionId: string,
    @CurrentTenant() tenantId: string | null,
    @CurrentUser() user: RequestUser,
  ) {
    return this.branchesService.findAll(institutionId, tenantId, user);
  }

  @Get(':id')
  @RequirePermission('core.branch.view')
  @RequireScope({ level: 'branch', institutionIdParam: 'institutionId', branchIdParam: 'id' })
  findOne(
    @Param('institutionId', ParseUUIDPipe) institutionId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentTenant() tenantId: string | null,
    @CurrentUser() user: RequestUser,
  ) {
    return this.branchesService.findOne(id, institutionId, tenantId, user);
  }

  @Post()
  @RequirePermission('core.branch.create')
  @RequireScope({ level: 'institution', institutionIdParam: 'institutionId' })
  create(
    @Param('institutionId', ParseUUIDPipe) institutionId: string,
    @Body() dto: CreateBranchDto,
    @CurrentTenant() tenantId: string | null,
  ) {
    return this.branchesService.create(institutionId, tenantId, dto);
  }

  @Patch(':id')
  @RequirePermission('core.branch.update')
  @RequireScope({ level: 'branch', institutionIdParam: 'institutionId', branchIdParam: 'id' })
  update(
    @Param('institutionId', ParseUUIDPipe) institutionId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateBranchDto,
    @CurrentTenant() tenantId: string | null,
    @CurrentUser() user: RequestUser,
  ) {
    return this.branchesService.update(id, institutionId, tenantId, dto, user);
  }
}
