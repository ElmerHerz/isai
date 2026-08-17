import {
  Controller, Get, Post, Patch, Delete, Param, Body, ParseUUIDPipe, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { BranchSchedulesService } from './branch-schedules.service';
import { CreateBranchScheduleDto } from './dto/create-branch-schedule.dto';
import { UpdateBranchScheduleDto } from './dto/update-branch-schedule.dto';
import { RequirePermission } from '../../../common/decorators/require-permission.decorator';
import { RequireScope } from '../../../common/decorators/require-scope.decorator';

@ApiTags('branches')
@ApiBearerAuth('access-token')
@Controller({ path: 'branches/:branchId/schedules', version: '1' })
export class BranchSchedulesController {
  constructor(private readonly branchSchedulesService: BranchSchedulesService) {}

  @Get()
  @RequirePermission('core.branch.view')
  @RequireScope({ level: 'branch', branchIdParam: 'branchId' })
  @ApiOperation({ summary: 'Listar franjas de horario de la sucursal' })
  findAll(@Param('branchId', ParseUUIDPipe) branchId: string) {
    return this.branchSchedulesService.findAll(branchId);
  }

  @Post()
  @RequirePermission('core.branch.update')
  @RequireScope({ level: 'branch', branchIdParam: 'branchId' })
  @ApiOperation({ summary: 'Agregar una franja de horario a la sucursal' })
  create(
    @Param('branchId', ParseUUIDPipe) branchId: string,
    @Body() dto: CreateBranchScheduleDto,
  ) {
    return this.branchSchedulesService.create(branchId, dto);
  }

  @Patch(':id')
  @RequirePermission('core.branch.update')
  @RequireScope({ level: 'branch', branchIdParam: 'branchId' })
  @ApiOperation({ summary: 'Actualizar una franja de horario' })
  update(
    @Param('branchId', ParseUUIDPipe) branchId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateBranchScheduleDto,
  ) {
    return this.branchSchedulesService.update(id, branchId, dto);
  }

  @Delete(':id')
  @RequirePermission('core.branch.update')
  @RequireScope({ level: 'branch', branchIdParam: 'branchId' })
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Eliminar una franja de horario' })
  remove(
    @Param('branchId', ParseUUIDPipe) branchId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.branchSchedulesService.remove(id, branchId);
  }
}
