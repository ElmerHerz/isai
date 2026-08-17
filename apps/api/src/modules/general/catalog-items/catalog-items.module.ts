import { Module } from '@nestjs/common';
import { CatalogItemsController } from './catalog-items.controller';
import { CatalogItemsService } from './catalog-items.service';

@Module({
  controllers: [CatalogItemsController],
  providers: [CatalogItemsService],
  exports: [CatalogItemsService],
})
export class CatalogItemsModule {}
