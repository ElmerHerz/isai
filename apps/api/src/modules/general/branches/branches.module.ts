import { Module } from '@nestjs/common';
import { BranchesController } from './branches.controller';
import { AllBranchesController } from './branches-all.controller';
import { AddressController } from './address.controller';
import { BranchesService } from './branches.service';

@Module({
  controllers: [BranchesController, AllBranchesController, AddressController],
  providers: [BranchesService],
  exports: [BranchesService],
})
export class BranchesModule {}
