import { Injectable, NotFoundException, BadRequestException, ForbiddenException, ConflictException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { GroupsService } from '../../membresia/groups/groups.service';
import { LedgerService } from '../ledger/ledger.service';
import { ExpenseApprovalsService } from '../approvals/expense-approvals.service';
import { DocumentSequencesService } from '../../general/document-sequences/document-sequences.service';
import { CreateGroupFundMovementDto } from './dto/create-group-fund-movement.dto';
import { resolveGroupScope } from '../../../common/utils/institution-scope.util';
import type { RequestUser } from '../../../common/decorators/current-user.decorator';

const ACCOUNT_TYPE_CATALOG_CODE = 'account_type';
// sourceType propio de los asientos creados por este módulo — ver el
// comentario de más abajo sobre por qué getFundBalance/listFundMovements
// filtran por esto y no solo por group_id.
const GROUP_FUND_SOURCE_TYPE = 'group_fund_movement';

const expenseAccountInclude = { account: { select: { id: true, code: true, name: true } } };

// Fondo propio de un grupo (ej. "Fondo de Equipos" del ministerio de
// alabanza) — Parte B del módulo de finanzas, ver plan de sesión.
//
// INGRESOS se contabilizan de inmediato (POST crea el asiento en el mismo
// paso, sin aprobación posible — ver plan de sesión). GASTOS pasan por
// GroupFundExpense (schema finanzas), mismo patrón de 2 pasos que
// ProjectExpense (registrar → Contabilizar), necesario para que la ruta de
// aprobación por cuenta (ExpenseApprovalsService, compartido con Proyectos)
// pueda pausarlos antes de tocar Caja — antes de esto, TODO movimiento acá
// se contabilizaba de inmediato sin ningún concepto de "pendiente".
//
// El asiento de 2 líneas es el mismo patrón de siempre (debe Caja/haber
// cuenta de ingreso para un ingreso, debe cuenta de gasto/haber Caja para
// un gasto) — armado vía LedgerService.postEntry, no inline.
//
// El "saldo del fondo" NO se calcula con SUM(debit-credit) filtrando por
// group_id como hace AccountsService con account_id: acá AMBAS líneas de
// cada asiento llevan el mismo group_id (para que reportes futuros puedan
// filtrar "todo lo de este grupo" cruzando cualquier cuenta), así que esa
// resta siempre da cero por construcción (débito y crédito del mismo asiento
// se cancelan). El saldo real se calcula sumando SOLO la línea "de
// categoría" (la cuenta de ingreso o gasto elegida, nunca la de Caja):
// credit-debit de esa línea ya da +monto para un ingreso y -monto para un
// gasto, sin importar el tipo de cuenta. Un GroupFundExpense pendiente
// (sin journalEntryId) no tiene línea todavía, así que correctamente no
// cuenta para el saldo hasta contabilizarse.
//
// IMPORTANTE — por qué también se filtra por sourceType: EventsService
// también puede etiquetar líneas con este mismo group_id (cuando un Event
// tiene groupId y se contabiliza su colecta, ver
// EventsService.postFundCollectionToLedger) — y esa colecta puede caer en
// la MISMA cuenta de ingreso (ej. "Ofrendas") que usa este módulo, pero
// debitando la Caja General de la sucursal, NUNCA la cuenta de caja propia
// del grupo (cashAccountId). Sin filtrar por sourceType, ese dinero — que
// nunca llegó a la caja propia del grupo — contaría igual en este saldo,
// desalineándolo del saldo real de cashAccountId. Filtrar por
// GROUP_FUND_SOURCE_TYPE aísla los dos flujos: acá solo cuenta lo que de
// verdad pasó por la caja propia del grupo.
@Injectable()
export class GroupFundsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly groupsService: GroupsService,
    private readonly ledger: LedgerService,
    private readonly expenseApprovals: ExpenseApprovalsService,
    private readonly documentSequences: DocumentSequencesService,
  ) {}

  // Lista para la pantalla "Fondos de Grupo" en Finanzas — reutiliza
  // GroupsService.findAll (ya resuelve institución/sucursal accesibles, y
  // ya incluye branch/cashAccount) y le agrega SOLO el filtro de alcance
  // específico de fondos (resolveGroupScope): un Administrador/Pastor
  // (scope de institución sin restricción de grupo) ve todos los grupos —
  // ya sea que tengan o no cuenta de caja configurada, para poder
  // configurársela desde acá — y un Tesorero con groupId puntual ve
  // únicamente el suyo. El permiso finance.group_fund.view en el
  // controller ya filtra quién llega hasta acá; esto filtra CUÁLES grupos.
  async listGroupFundsSummary(institutionId: string, tenantId: string | null, user: RequestUser) {
    const groups = await this.groupsService.findAll(institutionId, tenantId, user);

    let visible = groups;
    if (!user.isSuperadmin) {
      const groupScope = await resolveGroupScope(this.prisma, { ...user, institutionId });
      if (!groupScope.unrestricted) {
        visible = groups.filter((g) => groupScope.groupIds.includes(g.id));
      }
    }

    if (visible.length === 0) return [];

    const balanceRows = await this.prisma.$queryRaw<{ group_id: string; balance: string }[]>`
      SELECT l.group_id, COALESCE(SUM(
        CASE WHEN e.status = 'posted' THEN l.credit_amount - l.debit_amount ELSE 0 END
      ), 0)::text AS balance
      FROM finanzas.journal_entry_lines l
      JOIN finanzas.journal_entries e ON e.id = l.journal_entry_id
      JOIN finanzas.accounts a ON a.id = l.account_id
      JOIN general.catalog_items ct ON ct.id = a.account_type_id
      WHERE l.group_id = ANY(${visible.map((g) => g.id)}::uuid[])
        AND e.source_type = ${GROUP_FUND_SOURCE_TYPE}
        AND ct.catalog_code = ${ACCOUNT_TYPE_CATALOG_CODE}
        AND ct.code IN ('INCOME', 'EXPENSE')
      GROUP BY l.group_id
    `;
    const balanceByGroupId = new Map(balanceRows.map((r) => [r.group_id, r.balance]));

    return visible.map((g) => ({ ...g, balance: balanceByGroupId.get(g.id) ?? '0.00' }));
  }

  private async assertGroupFundAccessible(groupId: string, tenantId: string | null, user: RequestUser) {
    // GroupsService.findOne ya valida institución/sucursal accesibles y
    // lanza NotFoundException si no corresponde (nunca Forbidden, para no
    // filtrar la existencia del grupo — mismo criterio de todo el módulo).
    const group = await this.groupsService.findOne(groupId, tenantId, user);

    if (!user.isSuperadmin) {
      const groupScope = await resolveGroupScope(this.prisma, { ...user, institutionId: group.institutionId });
      if (!groupScope.unrestricted && !groupScope.groupIds.includes(group.id)) {
        throw new ForbiddenException('No tienes alcance sobre el fondo de este grupo.');
      }
    }

    return group;
  }

  async getFundBalance(groupId: string, tenantId: string | null, user: RequestUser) {
    await this.assertGroupFundAccessible(groupId, tenantId, user);

    const [row] = await this.prisma.$queryRaw<{ balance: string }[]>`
      SELECT COALESCE(SUM(
        CASE WHEN e.status = 'posted' THEN l.credit_amount - l.debit_amount ELSE 0 END
      ), 0)::text AS balance
      FROM finanzas.journal_entry_lines l
      JOIN finanzas.journal_entries e ON e.id = l.journal_entry_id
      JOIN finanzas.accounts a ON a.id = l.account_id
      JOIN general.catalog_items ct ON ct.id = a.account_type_id
      WHERE l.group_id = ${groupId}::uuid
        AND e.source_type = ${GROUP_FUND_SOURCE_TYPE}
        AND ct.catalog_code = ${ACCOUNT_TYPE_CATALOG_CODE}
        AND ct.code IN ('INCOME', 'EXPENSE')
    `;

    return { balance: row?.balance ?? '0.00' };
  }

  // Ingresos: se siguen leyendo de journal_entry_lines (siempre posted, sin
  // aprobación posible). Gastos: se leen directo de GroupFundExpense
  // (pendientes, rechazados o ya contabilizados tienen ahí su propio
  // amount/movementDate — no hace falta el join a líneas para mostrarlos),
  // combinados en un solo feed ordenado por fecha.
  async listFundMovements(groupId: string, tenantId: string | null, user: RequestUser) {
    await this.assertGroupFundAccessible(groupId, tenantId, user);

    const [incomeLines, expenses] = await Promise.all([
      this.prisma.journalEntryLine.findMany({
        where: {
          groupId,
          journalEntry: { sourceType: GROUP_FUND_SOURCE_TYPE },
          account: { accountType: { catalogCode: ACCOUNT_TYPE_CATALOG_CODE, code: 'INCOME' } },
        },
        include: {
          account: { select: { id: true, code: true, name: true } },
          journalEntry: { select: { id: true, entryDate: true, description: true, createdAt: true } },
        },
      }),
      this.prisma.groupFundExpense.findMany({
        where: { groupId },
        include: expenseAccountInclude,
      }),
    ]);

    const incomeRows = incomeLines.map((line) => ({
      id: line.id,
      journalEntryId: line.journalEntryId as string | null,
      type: 'income' as const,
      account: line.account,
      amount: line.creditAmount.toString(),
      entryDate: line.journalEntry.entryDate,
      notes: line.description,
      documentNumber: null as string | null,
      approvalStatus: null as string | null,
      canCurrentUserApprove: false,
      activeStepApprover: undefined as { id: string; firstName: string; lastName: string } | undefined,
    }));

    const expensesWithApproval = await this.expenseApprovals.attachApprovalInfo('group_fund_expense', expenses, user);
    const expenseRows = expensesWithApproval.map((e) => ({
      id: e.id,
      journalEntryId: e.journalEntryId,
      type: 'expense' as const,
      account: e.account,
      amount: e.amount.toString(),
      entryDate: e.movementDate,
      notes: e.notes,
      documentNumber: e.documentNumber,
      approvalStatus: e.approvalStatus as string | null,
      canCurrentUserApprove: e.canCurrentUserApprove,
      activeStepApprover: e.activeStepApprover,
    }));

    return [...incomeRows, ...expenseRows].sort(
      (a, b) => new Date(b.entryDate).getTime() - new Date(a.entryDate).getTime(),
    );
  }

  private async resolveGroupAndAccount(
    groupId: string,
    tenantId: string | null,
    dto: Pick<CreateGroupFundMovementDto, 'accountId' | 'type' | 'branchId'>,
    user: RequestUser,
  ) {
    const group = await this.assertGroupFundAccessible(groupId, tenantId, user);
    const institution = await this.prisma.institution.findUniqueOrThrow({ where: { id: group.institutionId } });

    // El dinero del fondo de un grupo puede estar separado físicamente de la
    // caja general de la sucursal (ver plan de sesión) — por eso NO se usa
    // branch.defaultCashAccountId como en Proyectos/Eventos, sino la cuenta
    // de Activo propia del grupo (Group.cashAccountId, configurada desde
    // Grupos → Editar). Bloquea igual que Project.incomeAccountId bloquea
    // Contabilizar cuando falta configurar.
    if (!group.cashAccountId) {
      throw new BadRequestException(
        `El grupo "${group.name}" no tiene una cuenta de caja configurada para su fondo propio. Configúrala desde Grupos → Editar antes de registrar movimientos.`,
      );
    }

    // branchId ya no decide la caja (eso lo resuelve cashAccountId) — se
    // conserva solo como dimensión informativa del asiento cuando se puede
    // resolver, sin bloquear si el grupo no tiene sucursal propia y no se
    // indicó una en el body.
    const branchId = group.branchId ?? dto.branchId ?? null;
    if (branchId) {
      const branch = await this.prisma.branch.findFirst({ where: { id: branchId, institutionId: group.institutionId } });
      if (!branch) {
        throw new BadRequestException('La sucursal no pertenece a la institución de este grupo.');
      }
    }

    // Nunca confiar en que el <Select> del frontend ya filtró por tenant —
    // mismo criterio reforzado en la auditoría de sesión (ver
    // ProjectsService.assertAccountBelongsToTenant).
    const account = await this.prisma.account.findFirst({
      where: { id: dto.accountId, tenantId: institution.tenantId },
      include: { accountType: { select: { code: true } } },
    });
    if (!account) {
      throw new BadRequestException('Esa cuenta no pertenece a este tenant.');
    }
    const expectedType = dto.type === 'income' ? 'INCOME' : 'EXPENSE';
    if (account.accountType.code !== expectedType) {
      throw new BadRequestException(
        dto.type === 'income' ? 'La cuenta elegida debe ser de tipo Ingreso.' : 'La cuenta elegida debe ser de tipo Gasto.',
      );
    }
    if (!account.allowsTransactions) {
      throw new BadRequestException('Esa cuenta es de agrupación — elige una cuenta que admita movimientos.');
    }

    return { group, institution, branchId, cashAccountId: group.cashAccountId };
  }

  async createFundMovement(
    groupId: string,
    tenantId: string | null,
    dto: CreateGroupFundMovementDto,
    user: RequestUser,
  ) {
    const { group, institution, branchId, cashAccountId } = await this.resolveGroupAndAccount(groupId, tenantId, dto, user);
    const amount = new Prisma.Decimal(dto.amount);
    const entryDate = new Date(dto.movementDate);

    // Ingreso: sin cambios, contabiliza de inmediato — nunca lleva
    // aprobación (ver header del archivo).
    if (dto.type === 'income') {
      return this.prisma.$transaction(async (tx) => {
        const journalEntry = await this.ledger.postEntry(tx, {
          tenantId: institution.tenantId,
          institutionId: group.institutionId,
          branchId,
          entryDate,
          description: dto.notes ?? `Fondo de ${group.name}`,
          sourceType: GROUP_FUND_SOURCE_TYPE,
          createdBy: user.userId,
          lines: [
            { accountId: cashAccountId, groupId, debitAmount: amount, description: 'Caja' },
            { accountId: dto.accountId, groupId, creditAmount: amount, description: `Fondo de ${group.name}` },
          ],
        });

        return { id: journalEntry.id, entryDate: journalEntry.entryDate, type: 'income' as const, amount: amount.toString() };
      });
    }

    // Gasto: 2 pasos, igual que Proyectos — registrar crea el
    // GroupFundExpense sin contabilizar; "Contabilizar" (más abajo) es una
    // acción aparte, gatillada de inmediato si no requiere aprobación o
    // tras aprobarse si sí la requiere.
    const route = await this.expenseApprovals.resolveRoute(
      institution.tenantId,
      group.institutionId,
      branchId,
      dto.accountId,
      dto.amount,
    );

    const expense = await this.prisma.$transaction(async (tx) => {
      const documentNumber = await this.documentSequences.getNextDocumentNumber(tx, {
        tenantId: institution.tenantId,
        branchId,
        documentTypeCode: 'group_fund_expense',
      });

      const created = await tx.groupFundExpense.create({
        data: {
          groupId,
          accountId: dto.accountId,
          amount,
          movementDate: entryDate,
          notes: dto.notes,
          createdBy: user.userId,
          approvalStatus: route ? 'pending' : 'not_required',
          documentNumber,
        },
      });

      if (route) {
        await this.expenseApprovals.createRequest(tx, { sourceType: 'group_fund_expense', sourceId: created.id, route });
      }

      return created;
    });

    const full = await this.prisma.groupFundExpense.findUniqueOrThrow({
      where: { id: expense.id },
      include: expenseAccountInclude,
    });
    const [withApproval] = await this.expenseApprovals.attachApprovalInfo('group_fund_expense', [full], user);
    return { ...withApproval, type: 'expense' as const };
  }

  async approveFundExpense(groupId: string, expenseId: string, tenantId: string | null, user: RequestUser) {
    await this.assertGroupFundAccessible(groupId, tenantId, user);

    const expense = await this.prisma.groupFundExpense.findFirst({ where: { id: expenseId, groupId } });
    if (!expense) throw new NotFoundException(`Gasto "${expenseId}" no encontrado`);

    const active = await this.expenseApprovals.assertCanDecide('group_fund_expense', expenseId, expense.createdBy, user);

    await this.prisma.$transaction(async (tx) => {
      const result = await this.expenseApprovals.applyApproval(tx, active);
      if (result === 'approved') {
        await tx.groupFundExpense.update({ where: { id: expenseId }, data: { approvalStatus: 'approved' } });
      }
    });

    return this.prisma.groupFundExpense.findUniqueOrThrow({ where: { id: expenseId }, include: expenseAccountInclude });
  }

  async rejectFundExpense(
    groupId: string,
    expenseId: string,
    reason: string,
    tenantId: string | null,
    user: RequestUser,
  ) {
    await this.assertGroupFundAccessible(groupId, tenantId, user);

    const expense = await this.prisma.groupFundExpense.findFirst({ where: { id: expenseId, groupId } });
    if (!expense) throw new NotFoundException(`Gasto "${expenseId}" no encontrado`);

    const active = await this.expenseApprovals.assertCanDecide('group_fund_expense', expenseId, expense.createdBy, user);

    await this.prisma.$transaction(async (tx) => {
      await this.expenseApprovals.applyRejection(tx, active, reason);
      await tx.groupFundExpense.update({ where: { id: expenseId }, data: { approvalStatus: 'rejected' } });
    });

    return this.prisma.groupFundExpense.findUniqueOrThrow({ where: { id: expenseId }, include: expenseAccountInclude });
  }

  async removeFundExpense(groupId: string, expenseId: string, tenantId: string | null, user: RequestUser) {
    await this.assertGroupFundAccessible(groupId, tenantId, user);

    const row = await this.prisma.groupFundExpense.findFirst({ where: { id: expenseId, groupId } });
    if (!row) throw new NotFoundException(`Gasto "${expenseId}" no encontrado`);
    if (row.journalEntryId) {
      throw new BadRequestException('Este gasto ya fue contabilizado — no se puede eliminar sin dejar un asiento huérfano.');
    }

    await this.prisma.groupFundExpense.delete({ where: { id: expenseId } });
  }

  // Debe la cuenta de gasto elegida, haber Caja — mismo asiento de 2 líneas
  // que antes armaba createFundMovement inline, ahora como acción aparte
  // (mismo patrón que ProjectsService.postExpenseToLedger).
  async postFundExpenseToLedger(groupId: string, expenseId: string, tenantId: string | null, user: RequestUser) {
    const group = await this.assertGroupFundAccessible(groupId, tenantId, user);
    const institution = await this.prisma.institution.findUniqueOrThrow({ where: { id: group.institutionId } });

    const expense = await this.prisma.groupFundExpense.findFirst({ where: { id: expenseId, groupId } });
    if (!expense) throw new NotFoundException(`Gasto "${expenseId}" no encontrado`);
    if (expense.journalEntryId) {
      throw new BadRequestException('Este gasto ya fue contabilizado.');
    }
    if (expense.approvalStatus === 'pending') {
      throw new BadRequestException('Este gasto está pendiente de aprobación — no se puede contabilizar todavía.');
    }
    if (expense.approvalStatus === 'rejected') {
      throw new BadRequestException('Este gasto fue rechazado — elimínalo y registra uno corregido.');
    }
    if (!group.cashAccountId) {
      throw new BadRequestException(
        `El grupo "${group.name}" no tiene una cuenta de caja configurada para su fondo propio.`,
      );
    }
    const cashAccountId = group.cashAccountId;
    const branchId = group.branchId ?? null;

    return this.prisma.$transaction(async (tx) => {
      const journalEntry = await this.ledger.postEntry(tx, {
        tenantId: institution.tenantId,
        institutionId: group.institutionId,
        branchId,
        entryDate: expense.movementDate,
        description: `Gasto de fondo de ${group.name}`,
        sourceType: GROUP_FUND_SOURCE_TYPE,
        createdBy: user.userId,
        lines: [
          { accountId: expense.accountId, groupId, debitAmount: expense.amount, description: `Fondo de ${group.name}` },
          { accountId: cashAccountId, groupId, creditAmount: expense.amount, description: 'Caja' },
        ],
      });

      // Mismo reclamo atómico contra dos "Contabilizar" simultáneos que
      // ProjectsService.postExpenseToLedger.
      const claim = await tx.groupFundExpense.updateMany({
        where: { id: expenseId, journalEntryId: null },
        data: { journalEntryId: journalEntry.id },
      });
      if (claim.count === 0) {
        throw new ConflictException('Este gasto ya fue contabilizado por otra solicitud.');
      }

      return tx.groupFundExpense.findUniqueOrThrow({ where: { id: expenseId }, include: expenseAccountInclude });
    });
  }
}
