import { Controller, Get, Put, Param, Body, ParseUUIDPipe } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { BranchesService } from './branches.service';
import { UpsertAddressDto } from './dto/upsert-address.dto';
import { RequirePermission } from '../../../common/decorators/require-permission.decorator';
import { RequireScope } from '../../../common/decorators/require-scope.decorator';

// Controller separado porque extiende un sub-recurso de sucursal (dirección)
// sin mezclar el prefijo de institutions/:institutionId/branches.
@ApiTags('branches')
@ApiBearerAuth('access-token')
@Controller({ path: 'branches/:branchId/address', version: '1' })
export class AddressController {
  constructor(private readonly branchesService: BranchesService) {}

  @Get()
  @RequirePermission('core.branch.view')
  @RequireScope({ level: 'branch' })
  @ApiOperation({ summary: 'Dirección primaria de la sucursal (o null si no tiene)' })
  getAddress(@Param('branchId', ParseUUIDPipe) branchId: string) {
    return this.branchesService.getAddress(branchId);
  }

  @Put()
  @RequirePermission('core.branch.update')
  @RequireScope({ level: 'branch' })
  @ApiOperation({ summary: 'Crear o actualizar la dirección primaria de la sucursal' })
  upsertAddress(
    @Param('branchId', ParseUUIDPipe) branchId: string,
    @Body() dto: UpsertAddressDto,
  ) {
    return this.branchesService.upsertAddress(branchId, dto);
  }
}
