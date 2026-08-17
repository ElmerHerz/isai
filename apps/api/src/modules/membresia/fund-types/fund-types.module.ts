import { Module } from '@nestjs/common';
import { FundTypesController } from './fund-types.controller';
import { FundTypesService } from './fund-types.service';

@Module({
  controllers: [FundTypesController],
  providers: [FundTypesService],
  exports: [FundTypesService],
})
export class FundTypesModule {}
