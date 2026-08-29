import { Injectable, BadRequestException, ForbiddenException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../common/prisma/prisma.service';
import type { RequestUser } from '../../../common/decorators/current-user.decorator';

export type ExpenseSourceType = 'project_expense' | 'group_fund_expense';

const stepsInclude = {
  steps: {
    orderBy: { stepOrder: 'asc' as const },
    include: { approverUser: { select: { id: true, firstName: true, lastName: true } } },
  },
};

interface RouteWithSteps {
  id: string;
  steps: { stepOrder: number; approverUserId: string }[];
}

// Motor de aprobación de gastos, genérico sobre "de dónde nace el gasto"
// (project_expense | group_fund_expense) vía sourceType/sourceId — ver
// finanzas.prisma para el porqué (sin FK dura, dos schemas de origen
// posibles). Los métodos que escriben reciben la tx del CALLER (mismo
// criterio que LedgerService/DocumentSequencesService): quien orquesta el
// registro/decisión de un gasto es quien abre la transacción, porque
// también necesita sincronizar su propia columna approvalStatus dentro de
// la misma tx.
@Injectable()
export class ExpenseApprovalsService {
  constructor(private readonly prisma: PrismaService) {}

  // Gana la ruta más exigente que igual aplica (mayor minAmount <= el monto
  // del gasto); empate → la más específica, donde "específica" combina
  // cuenta (una ruta con cuentas listadas y que incluye la cuenta del gasto
  // pesa más que ubicación) y ubicación (sucursal > institución > tenant).
  // Rutas con accounts=[] no existen hoy (accountIds es obligatorio al
  // crear una ruta), pero la condición se deja robusta igual. Sin ruta
  // aplicable = no requiere aprobación.
  async resolveRoute(
    tenantId: string,
    institutionId: string,
    branchId: string | null,
    accountId: string,
    amount: number,
  ): Promise<RouteWithSteps | null> {
    const routes = await this.prisma.approvalRoute.findMany({
      where: {
        tenantId,
        isActive: true,
        minAmount: { lte: amount },
        OR: [
          { institutionId, branchId },
          { institutionId, branchId: null },
          { institutionId: null, branchId: null },
        ],
        AND: {
          OR: [{ accounts: { none: {} } }, { accounts: { some: { accountId } } }],
        },
      },
      include: { steps: { orderBy: { stepOrder: 'asc' } }, accounts: true },
    });
    if (routes.length === 0) return null;

    const specificity = (r: (typeof routes)[number]) =>
      (r.accounts.length > 0 ? 4 : 0) + (r.branchId ? 2 : r.institutionId ? 1 : 0);
    routes.sort((a, b) => Number(b.minAmount) - Number(a.minAmount) || specificity(b) - specificity(a));
    return routes[0]!;
  }

  // Clona los pasos de la ruta a una solicitud real — dentro de la tx del
  // caller, junto con la creación del gasto mismo.
  createRequest(
    tx: Prisma.TransactionClient,
    params: { sourceType: ExpenseSourceType; sourceId: string; route: RouteWithSteps },
  ) {
    return tx.expenseApprovalRequest.create({
      data: {
        sourceType: params.sourceType,
        sourceId: params.sourceId,
        routeId: params.route.id,
        steps: {
          create: params.route.steps.map((step) => ({
            stepOrder: step.stepOrder,
            approverUserId: step.approverUserId,
          })),
        },
      },
    });
  }

  // Carga la solicitud + el paso accionable (menor stepOrder en 'pending')
  // de un gasto, o null si no requiere aprobación / ya se resolvió.
  private async getActiveStep(sourceType: ExpenseSourceType, sourceId: string) {
    const request = await this.prisma.expenseApprovalRequest.findUnique({
      where: { uq_expense_approval_source: { sourceType, sourceId } },
      include: stepsInclude,
    });
    if (!request || request.status !== 'pending') return null;
    return { request, step: request.steps.find((s) => s.status === 'pending') ?? null };
  }

  // Valida que el usuario actual pueda decidir el paso accionable ahora
  // (nunca quien registró el gasto, y solo la persona asignada a ese paso
  // puntual) — lanza si no corresponde. El caller aplica la decisión
  // (approve/reject de abajo) dentro de SU transacción, para sincronizar su
  // propia columna approvalStatus atómicamente.
  async assertCanDecide(sourceType: ExpenseSourceType, sourceId: string, createdBy: string | null, user: RequestUser) {
    if (createdBy === user.userId) {
      throw new ForbiddenException('Quien registró el gasto no puede decidir su propio paso.');
    }
    const active = await this.getActiveStep(sourceType, sourceId);
    if (!active || !active.step) {
      throw new BadRequestException('Este gasto no está pendiente de aprobación.');
    }
    if (active.step.approverUserId !== user.userId) {
      throw new ForbiddenException('No eres la persona asignada a este paso de aprobación.');
    }
    return active;
  }

  // Retorna 'approved' si esa era la última decisión pendiente (el caller
  // debe sincronizar su approvalStatus a 'approved'), o 'pending' si
  // todavía faltan pasos.
  async applyApproval(tx: Prisma.TransactionClient, active: NonNullable<Awaited<ReturnType<ExpenseApprovalsService['getActiveStep']>>>) {
    const isLastStep = active.step!.stepOrder === Math.max(...active.request.steps.map((s) => s.stepOrder));

    await tx.expenseApprovalStep.update({
      where: { id: active.step!.id },
      data: { status: 'approved', decidedAt: new Date() },
    });
    if (isLastStep) {
      await tx.expenseApprovalRequest.update({
        where: { id: active.request.id },
        data: { status: 'approved', resolvedAt: new Date() },
      });
    }

    return isLastStep ? ('approved' as const) : ('pending' as const);
  }

  // Los pasos siguientes que nunca se alcanzaron quedan 'skipped' — no
  // 'pending' colgado para siempre, ni se les pide decisión.
  async applyRejection(
    tx: Prisma.TransactionClient,
    active: NonNullable<Awaited<ReturnType<ExpenseApprovalsService['getActiveStep']>>>,
    reason: string,
  ) {
    await tx.expenseApprovalStep.update({
      where: { id: active.step!.id },
      data: { status: 'rejected', decidedAt: new Date(), rejectedReason: reason },
    });
    await tx.expenseApprovalStep.updateMany({
      where: { requestId: active.request.id, status: 'pending' },
      data: { status: 'skipped' },
    });
    await tx.expenseApprovalRequest.update({
      where: { id: active.request.id },
      data: { status: 'rejected', resolvedAt: new Date() },
    });
  }

  // Agrega canCurrentUserApprove (y la persona del paso activo, para
  // mostrarla en el badge) a una lista de gastos — sin obligar al caller a
  // razonar sobre pasos. El paso "accionable ahora" es siempre el de menor
  // stepOrder con status='pending' dentro de su solicitud. Con
  // approverUserId puntual, "puede aprobar" es una comparación directa de
  // ids. Quien registró el gasto nunca puede aprobar su propio paso, sin
  // importar si además es la persona asignada.
  async attachApprovalInfo<T extends { id: string; createdBy: string | null }>(
    sourceType: ExpenseSourceType,
    items: T[],
    user: RequestUser,
  ) {
    if (items.length === 0) return items as (T & { canCurrentUserApprove: boolean; activeStepApprover?: { id: string; firstName: string; lastName: string } })[];

    const requests = await this.prisma.expenseApprovalRequest.findMany({
      where: { sourceType, sourceId: { in: items.map((i) => i.id) } },
      include: stepsInclude,
    });
    const requestBySourceId = new Map(requests.map((r) => [r.sourceId, r]));

    return items.map((item) => {
      const request = requestBySourceId.get(item.id);
      const activeStep = request?.steps.find((s) => s.status === 'pending');
      const canCurrentUserApprove =
        !!activeStep && activeStep.approverUserId === user.userId && item.createdBy !== user.userId;
      return { ...item, canCurrentUserApprove, activeStepApprover: activeStep?.approverUser };
    });
  }

  // --- Monitor de aprobaciones (pantalla "Aprobaciones") ---------------------
  // Dos vistas sobre la misma solicitud pendiente: la cola personal (solo lo
  // que le toca decidir AHORA al usuario actual) y el monitor admin (todo lo
  // pendiente del tenant, para dar seguimiento). Ambas resuelven el origen
  // polimórfico (Proyecto o Fondo de Grupo) para no obligar al frontend a
  // cruzar nada — la fila ya trae `project`/`group` como discriminador.

  // "Mías": entre TODAS mis asignaciones en cualquier paso, solo cuentan las
  // solicitudes donde mi paso es el accionable ahora mismo (menor stepOrder
  // en 'pending') — mismo criterio que attachApprovalInfo/assertCanDecide.
  async listMine(tenantId: string, userId: string) {
    const requests = await this.prisma.expenseApprovalRequest.findMany({
      where: { status: 'pending', route: { tenantId }, steps: { some: { approverUserId: userId, status: 'pending' } } },
      include: { ...stepsInclude, route: { select: { name: true } } },
      orderBy: { createdAt: 'asc' },
    });
    const mine = requests.filter((r) => r.steps.find((s) => s.status === 'pending')?.approverUserId === userId);
    return this.resolveSourceDetails(mine);
  }

  // "Todo el tenant": sin filtro de usuario — para supervisión, no para
  // actuar (el botón Aprobar/Rechazar en el frontend solo se activa si la
  // fila también resulta ser tuya, mismo canCurrentUserApprove de siempre).
  async listAll(tenantId: string) {
    const requests = await this.prisma.expenseApprovalRequest.findMany({
      where: { status: 'pending', route: { tenantId } },
      include: { ...stepsInclude, route: { select: { name: true } } },
      orderBy: { createdAt: 'asc' },
    });
    return this.resolveSourceDetails(requests);
  }

  private async resolveSourceDetails(
    requests: {
      id: string;
      sourceType: string;
      sourceId: string;
      createdAt: Date;
      route: { name: string };
      steps: { stepOrder: number; status: string; approverUserId: string; approverUser: { id: string; firstName: string; lastName: string } }[];
    }[],
  ) {
    const projectExpenseIds = requests.filter((r) => r.sourceType === 'project_expense').map((r) => r.sourceId);
    const groupFundExpenseIds = requests.filter((r) => r.sourceType === 'group_fund_expense').map((r) => r.sourceId);

    const [projectExpenses, groupFundExpenses] = await Promise.all([
      projectExpenseIds.length
        ? this.prisma.projectExpense.findMany({
            where: { id: { in: projectExpenseIds } },
            include: {
              account: { select: { id: true, code: true, name: true } },
              project: { select: { id: true, name: true } },
              createdByUser: { select: { id: true, firstName: true, lastName: true } },
            },
          })
        : [],
      groupFundExpenseIds.length
        ? this.prisma.groupFundExpense.findMany({
            where: { id: { in: groupFundExpenseIds } },
            include: {
              account: { select: { id: true, code: true, name: true } },
              group: { select: { id: true, name: true } },
              createdByUser: { select: { id: true, firstName: true, lastName: true } },
            },
          })
        : [],
    ]);
    const projectExpenseById = new Map(projectExpenses.map((e) => [e.id, e]));
    const groupFundExpenseById = new Map(groupFundExpenses.map((e) => [e.id, e]));

    return requests
      .map((request) => {
        const source =
          request.sourceType === 'project_expense'
            ? projectExpenseById.get(request.sourceId)
            : groupFundExpenseById.get(request.sourceId);
        if (!source) return null; // huérfano defensivo — no debería pasar nunca

        const activeStep = request.steps.find((s) => s.status === 'pending');

        return {
          requestId: request.id,
          sourceType: request.sourceType as ExpenseSourceType,
          sourceId: request.sourceId,
          routeName: request.route.name,
          amount: source.amount.toString(),
          documentNumber: source.documentNumber,
          account: source.account,
          createdAt: request.createdAt,
          createdByUser: source.createdByUser,
          activeStepApprover: activeStep?.approverUser ?? null,
          stepOrder: activeStep?.stepOrder ?? request.steps.length,
          totalSteps: request.steps.length,
          project: 'project' in source ? source.project : undefined,
          group: 'group' in source ? source.group : undefined,
        };
      })
      .filter((row): row is NonNullable<typeof row> => row !== null);
  }
}
