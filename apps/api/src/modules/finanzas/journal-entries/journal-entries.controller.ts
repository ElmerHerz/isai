import { Controller, Get, Param, ParseUUIDPipe } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JournalEntriesService } from './journal-entries.service';
import { RequirePermission } from '../../../common/decorators/require-permission.decorator';
import { CurrentTenant } from '../../../common/decorators/current-tenant.decorator';

@ApiTags('finanzas-journal-entries')
@ApiBearerAuth('access-token')
@Controller({ path: 'journal-entries', version: '1' })
export class JournalEntriesController {
  constructor(private readonly journalEntriesService: JournalEntriesService) {}

  @Get()
  @RequirePermission('finance.journal_entry.view')
  @ApiOperation({ summary: 'Asientos contables del tenant activo' })
  findAll(@CurrentTenant() tenantId: string | null) {
    return this.journalEntriesService.findAll(tenantId);
  }

  @Get(':id')
  @RequirePermission('finance.journal_entry.view')
  @ApiOperation({ summary: 'Detalle de un asiento contable con sus líneas' })
  findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentTenant() tenantId: string | null) {
    return this.journalEntriesService.findOne(id, tenantId);
  }
}
