import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { GroupsService } from '../../membresia/groups/groups.service';
import { LedgerService } from '../ledger/ledger.service';
import { CreateGroupFundMovementDto } from './dto/create-group-fund-movement.dto';
import { resolveGroupScope } from '../../../common/utils/institution-scope.util';
import type { RequestUser } from '../../../common/decorators/current-user.decorator';

const ACCOUNT_TYPE_CATALOG_CODE = 'account_type';
// sourceType propio de los asientos creados por este módulo — ver el
// comentario de más abajo sobre por qué getFundBalance/listFundMovements
// filtran por esto y no solo por group_id.
const GROUP_FUND_SOURCE_TYPE = 'group_fund_movement';

// Fondo propio de un grupo (ej. "Fondo de Equipos" del ministerio de
// alabanza) — Parte B del módulo de finanzas, ver plan de sesión.
//
// A diferencia de ProjectsService, NO hay tabla intermedia tipo
// ProjectContribution/ProjectExpense ni paso de "Contabilizar" separado: acá
// cada movimiento se contabiliza de inmediato (POST crea el asiento en el
// mismo paso). El asiento de 2 líneas es el mismo patrón de siempre (debe
// Caja/haber cuenta de ingreso para un ingreso, debe cuenta de gasto/haber
// Caja para un gasto) — armado vía LedgerService.postEntry (Fase 1 de
// Finanzas, ver docs/finanzas-mejoras-propuestas.md §3), no inline.
//
// El "saldo del fondo" NO se calcula con SUM(debit-credit) filtrando por
// group_id como hace AccountsService con account_id: acá AMBAS líneas de
// cada asiento llevan el mismo group_id (para que reportes futuros puedan
// filtrar "todo lo de este grupo" cruzando cualquier cuenta), así que esa
// resta siempre da cero por construcción (débito y crédito del mismo asiento
// se cancelan). El saldo real se calcula sumando SOLO la línea "de
// categoría" (la cuenta de ingreso o gasto elegida, nunca la de Caja):
// credit-debit de esa línea ya da +monto para un ingreso y -monto para un
// gasto, sin importar el tipo de cuenta.
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

  async listFundMovements(groupId: string, tenantId: string | null, user: RequestUser) {
    await this.assertGroupFundAccessible(groupId, tenantId, user);

    const lines = await this.prisma.journalEntryLine.findMany({
      where: {
        groupId,
        journalEntry: { sourceType: GROUP_FUND_SOURCE_TYPE },
        account: { accountType: { catalogCode: ACCOUNT_TYPE_CATALOG_CODE, code: { in: ['INCOME', 'EXPENSE'] } } },
      },
      include: {
        account: { select: { id: true, code: true, name: true, accountType: { select: { code: true } } } },
        journalEntry: { select: { id: true, entryDate: true, description: true, createdAt: true } },
      },
      orderBy: { journalEntry: { entryDate: 'desc' } },
    });

    return lines.map((line) => ({
      id: line.id,
      journalEntryId: line.journalEntryId,
      type: line.account.accountType.code === 'INCOME' ? 'income' : 'expense',
      account: { id: line.account.id, code: line.account.code, name: line.account.name },
      amount: (line.account.accountType.code === 'INCOME' ? line.creditAmount : line.debitAmount).toString(),
      entryDate: line.journalEntry.entryDate,
      notes: line.description,
    }));
  }

  async createFundMovement(
    groupId: string,
    tenantId: string | null,
    dto: CreateGroupFundMovementDto,
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
    // Capturado en un const propio: TS no propaga el narrowing de
    // group.cashAccountId (acceso a propiedad) dentro del closure de
    // $transaction de más abajo.
    const cashAccountId = group.cashAccountId;

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

    const amount = new Prisma.Decimal(dto.amount);
    const entryDate = new Date(dto.movementDate);

    return this.prisma.$transaction(async (tx) => {
      const journalEntry = await this.ledger.postEntry(tx, {
        tenantId: institution.tenantId,
        institutionId: group.institutionId,
        branchId,
        entryDate,
        description: dto.notes ?? `Fondo de ${group.name}`,
        sourceType: GROUP_FUND_SOURCE_TYPE,
        createdBy: user.userId,
        lines:
          dto.type === 'income'
            ? [
                { accountId: cashAccountId, groupId, debitAmount: amount, description: 'Caja' },
                { accountId: dto.accountId, groupId, creditAmount: amount, description: `Fondo de ${group.name}` },
              ]
            : [
                { accountId: dto.accountId, groupId, debitAmount: amount, description: `Fondo de ${group.name}` },
                { accountId: cashAccountId, groupId, creditAmount: amount, description: 'Caja' },
              ],
      });

      return { id: journalEntry.id, entryDate: journalEntry.entryDate, type: dto.type, amount: amount.toString() };
    });
  }
}
