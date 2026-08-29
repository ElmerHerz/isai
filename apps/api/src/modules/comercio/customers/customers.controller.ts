import { Controller, Get, Post, Patch, Param, Body, ParseUUIDPipe } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { CustomersService } from './customers.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { RequirePermission } from '../../../common/decorators/require-permission.decorator';
import { CurrentTenant } from '../../../common/decorators/current-tenant.decorator';

@ApiTags('comercio-customers')
@ApiBearerAuth('access-token')
@Controller({ path: 'customers', version: '1' })
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Get()
  @RequirePermission('store.customer.view')
  @ApiOperation({ summary: 'Clientes del tenant activo' })
  findAll(@CurrentTenant() tenantId: string | null) {
    return this.customersService.findAll(tenantId);
  }

  @Get(':id')
  @RequirePermission('store.customer.view')
  @ApiOperation({ summary: 'Detalle de un cliente' })
  findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentTenant() tenantId: string | null) {
    return this.customersService.findOne(id, tenantId);
  }

  @Post()
  @RequirePermission('store.customer.create')
  @ApiOperation({ summary: 'Crear un cliente' })
  create(@Body() dto: CreateCustomerDto, @CurrentTenant() tenantId: string | null) {
    return this.customersService.create(tenantId, dto);
  }

  @Patch(':id')
  @RequirePermission('store.customer.update')
  @ApiOperation({ summary: 'Editar un cliente' })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateCustomerDto, @CurrentTenant() tenantId: string | null) {
    return this.customersService.update(id, tenantId, dto);
  }
}
