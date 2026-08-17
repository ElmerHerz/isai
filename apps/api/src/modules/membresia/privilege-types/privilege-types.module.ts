import { Module } from '@nestjs/common';
import { PrivilegeTypesController } from './privilege-types.controller';
import { PrivilegeTypesService } from './privilege-types.service';

@Module({
  controllers: [PrivilegeTypesController],
  providers: [PrivilegeTypesService],
  exports: [PrivilegeTypesService],
})
export class PrivilegeTypesModule {}
