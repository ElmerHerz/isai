import { Module } from '@nestjs/common';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { LedgerModule } from '../finanzas/ledger/ledger.module';
import { InventarioModule } from '../inventario/inventario.module';
import { DocumentSequencesModule } from '../general/document-sequences/document-sequences.module';
import { SuppliersController } from './suppliers/suppliers.controller';
import { SuppliersService } from './suppliers/suppliers.service';
import { PurchasesController } from './purchases/purchases.controller';
import { PurchasesService } from './purchases/purchases.service';
import { CustomersController } from './customers/customers.controller';
import { CustomersService } from './customers/customers.service';
import { SalesController } from './sales/sales.controller';
import { SalesService } from './sales/sales.service';
import { ComercioReportsController } from './reports/reports.controller';
import { ComercioReportsService } from './reports/reports.service';

/**
 * ComercioModule — Schema "comercio" de Postgres
 *
 * Rebanada 1 (docs/comercio-mejoras-propuestas.md §1, §4): Proveedores +
 * Compras. Rebanada 2 (§5): Clientes + Ventas — necesita DocumentSequencesModule
 * para el folio de factura/recibo (Compras no lo necesitaba). Se construye
 * ENCIMA de InventarioModule (para mover existencia vía
 * InventoryService.applyMovement) y LedgerModule (para contabilizar) — nunca
 * al revés, InventarioModule no sabe que este módulo existe.
 *
 * Regla: este módulo es el único que accede al schema "comercio" de Prisma.
 */
@Module({
  imports: [PrismaModule, LedgerModule, InventarioModule, DocumentSequencesModule],
  controllers: [SuppliersController, PurchasesController, CustomersController, SalesController, ComercioReportsController],
  providers: [SuppliersService, PurchasesService, CustomersService, SalesService, ComercioReportsService],
  exports: [SuppliersService, PurchasesService, CustomersService, SalesService],
})
export class ComercioModule {}
