import { Body, Controller, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JournalEntriesService } from './journal-entries.service';
import { VoidJournalEntryDto } from './dto/void-journal-entry.dto';
import { RequirePermission } from '../../../common/decorators/require-permission.decorator';
import { CurrentTenant } from '../../../common/decorators/current-tenant.decorator';
import { CurrentUser, RequestUser } from '../../../common/decorators/current-user.decorator';

@ApiTags('finanzas-journal-entries')
@ApiBearerAuth('access-token')
@Controller({ path: 'journal-entries', version: '1' })
export class JournalEntriesController {
  constructor(private readonly journalEntriesService: JournalEntriesService) {}

  @Get()
  @RequirePermission('finance.journal_entry.view')
  @ApiOperation({ summary: 'Asientos contables del tenant activo' })
  findAll(@CurrentTenant() tenantId: string | null, @CurrentUser() user: RequestUser) {
    return this.journalEntriesService.findAll(tenantId, user);
  }

  @Get(':id')
  @RequirePermission('finance.journal_entry.view')
  @ApiOperation({ summary: 'Detalle de un asiento contable con sus líneas' })
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentTenant() tenantId: string | null,
    @CurrentUser() user: RequestUser,
  ) {
    return this.journalEntriesService.findOne(id, tenantId, user);
  }

  @Post(':id/void')
  @RequirePermission('finance.journal_entry.delete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Anula un asiento contable y genera su reversa' })
  voidEntry(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: VoidJournalEntryDto,
    @CurrentTenant() tenantId: string | null,
    @CurrentUser() user: RequestUser,
  ) {
    return this.journalEntriesService.voidEntry(id, dto.reason, tenantId, user);
  }
}
