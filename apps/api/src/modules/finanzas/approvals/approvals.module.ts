import { Module } from '@nestjs/common';
import { ApprovalRoutesController } from './approval-routes.controller';
import { ApprovalRoutesService } from './approval-routes.service';
import { ExpenseApprovalsController } from './expense-approvals.controller';
import { ExpenseApprovalsService } from './expense-approvals.service';

// Vivía en el módulo proyectos (nació ahí, Fase 2 §7.3) — se movió a
// finanzas para poder gobernar también gastos de Fondo de Grupo
// (GroupFundsModule, mismo módulo padre) sin que FinanzasModule dependa de
// ProyectosModule (habría formado un ciclo, ver comentario en
// finanzas.module.ts). ProjectsModule lo consume "hacia abajo", igual que
// ya hace con LedgerModule.
@Module({
  controllers: [ApprovalRoutesController, ExpenseApprovalsController],
  providers: [ApprovalRoutesService, ExpenseApprovalsService],
  exports: [ApprovalRoutesService, ExpenseApprovalsService],
})
export class ApprovalsModule {}
