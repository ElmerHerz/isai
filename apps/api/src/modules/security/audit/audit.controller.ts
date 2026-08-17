import { Controller, Get, Query, DefaultValuePipe, ParseIntPipe } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { AuditService } from './audit.service';
import { RequirePermission } from '../../../common/decorators/require-permission.decorator';
import { CurrentTenant } from '../../../common/decorators/current-tenant.decorator';

@ApiTags('audit')
@ApiBearerAuth('access-token')
@Controller({ path: 'audit-logs', version: '1' })
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  @RequirePermission('security.audit.view')
  @ApiOperation({ summary: 'Listar bitácora de auditoría (paginada)' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'pageSize', required: false })
  @ApiQuery({ name: 'entityType', required: false })
  @ApiQuery({ name: 'action', required: false })
  @ApiQuery({ name: 'search', required: false })
  findAll(
    @CurrentTenant() tenantId: string | null,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('pageSize', new DefaultValuePipe(20), ParseIntPipe) pageSize: number,
    @Query('entityType') entityType?: string,
    @Query('action') action?: string,
    @Query('search') search?: string,
  ) {
    return this.auditService.findAll(tenantId, {
      page,
      pageSize: Math.min(pageSize, 100),
      entityType,
      action,
      search,
    });
  }

  @Get('entity-types')
  @RequirePermission('security.audit.view')
  @ApiOperation({ summary: 'Tipos de entidad distintos presentes en la bitácora (para el filtro)' })
  entityTypes(@CurrentTenant() tenantId: string | null) {
    return this.auditService.entityTypes(tenantId);
  }
}
