import { Module } from '@nestjs/common';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { LedgerModule } from '../finanzas/ledger/ledger.module';
import { ProductsController } from './products/products.controller';
import { ProductsService } from './products/products.service';
import { ProductCategoriesController } from './product-categories/product-categories.controller';
import { ProductCategoriesService } from './product-categories/product-categories.service';
import { InventoryService } from './inventory/inventory.service';
import { AssetsController } from './assets/assets.controller';
import { AssetsService } from './assets/assets.service';

/**
 * InventarioModule — Schema "inventario" de Postgres
 *
 * Rebanada 1 (§1-§2): catálogo de productos + categorías. Rebanada 2 (§3,
 * §3.1): existencias/movimientos + Uso interno — por eso importa LedgerModule
 * directo (no a través de ComercioModule, que ni existe todavía): el consumo
 * interno contabiliza aunque Comercio nunca se active para esa institución.
 * Rebanada 3 (§6): activos/equipo duradero — registro de custodia, sin
 * contabilidad (solo referencia opcional a un gasto ya existente). Cierra el
 * módulo Inventario completo. Módulo BASE — no depende de ComercioModule ni
 * de nada más; ComercioModule (cuando exista) importará este hacia abajo,
 * nunca al revés.
 *
 * Regla: este módulo es el único que accede al schema "inventario" de Prisma.
 */
@Module({
  imports: [PrismaModule, LedgerModule],
  controllers: [ProductsController, ProductCategoriesController, AssetsController],
  providers: [ProductsService, ProductCategoriesService, InventoryService, AssetsService],
  exports: [ProductsService, ProductCategoriesService, InventoryService, AssetsService],
})
export class InventarioModule {}
