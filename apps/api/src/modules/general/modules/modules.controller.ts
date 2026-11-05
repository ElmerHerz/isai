import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ModulesService } from './modules.service';
import { SuperadminOnly } from '../../../common/decorators/superadmin-only.decorator';

@ApiTags('modules')
@ApiBearerAuth('access-token')
@Controller({ path: 'modules', version: '1' })
export class ModulesController {
  constructor(private readonly modulesService: ModulesService) {}

  @Get()
  @SuperadminOnly()
  @ApiOperation({ summary: 'Catálogo de módulos del sistema (solo superadmin — usado para activar/desactivar por tenant)' })
  findAll() {
    return this.modulesService.findAll();
  }
}
